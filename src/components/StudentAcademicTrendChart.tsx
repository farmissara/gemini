import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Award, BookOpen } from 'lucide-react';
import { Course, GradeRecord, GradingSystem, Student } from '../types';
import {
  detectEducationStage,
  getRawScoreFeedback,
  isActivityCourse,
  isPrimaryStage,
  isSpecialMoeGrade,
  resolveEffectiveGrade,
} from '../lib/moeGrading';

interface StudentAcademicTrendChartProps {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  gradingSystem?: GradingSystem;
  compact?: boolean;
}

interface SemesterTrendPoint {
  termKey: string;
  termLabel: string;
  academicYear: string;
  semester: string;
  averageScore: number;
  termGpa: number | null;
  cumulativeGpax: number | null;
  subjectCount: number;
  creditsCount: number;
  feedbackTh: string;
  subjectsPreview: Array<{ code: string; title: string; score: number; letter: string }>;
}

function parseSemesterOrder(semesterRaw: string): number {
  const s = (semesterRaw || '').trim().toLowerCase();
  if (s === 'annual' || s === 'รายปี') return 9;
  if (s.includes('summer') || s.includes('ฤดูร้อน') || s === '3') return 3;
  const numMatch = s.match(/(\d+)/);
  if (numMatch) return Number(numMatch[1]);
  return 1;
}

function formatTermLabel(year: string, semester: string, isPrimary: boolean): string {
  const cleanYear = (year || '2569').trim();
  const s = (semester || '1').trim();
  if (isPrimary && (s === 'annual' || s === 'รายปี')) {
    return `ปี ${cleanYear}`;
  }
  if (s.toLowerCase().includes('summer') || s === '3') {
    return `ซัมเมอร์/${cleanYear}`;
  }
  const numMatch = s.match(/(\d+)/);
  const semNum = numMatch ? numMatch[1] : s;
  return `เทอม ${semNum}/${cleanYear}`;
}

export const StudentAcademicTrendChart: React.FC<StudentAcademicTrendChartProps> = ({
  student,
  courses,
  grades,
  gradingSystem = 'thai',
  compact = false,
}) => {
  const stage = detectEducationStage(student.gradeLevel);
  const isPrimary = isPrimaryStage(stage);
  const [metricMode, setMetricMode] = useState<'gpa' | 'score'>(isPrimary ? 'score' : 'gpa');

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const { points, hasMultipleTerms } = useMemo(() => {
    const studentGrades = grades.filter((g) => g.studentId === student.id);
    if (studentGrades.length === 0) {
      return { points: [] as SemesterTrendPoint[], hasMultipleTerms: false };
    }

    const grouped = new Map<
      string,
      { academicYear: string; semester: string; items: GradeRecord[] }
    >();

    for (const g of studentGrades) {
      const course = courseById.get(g.courseId);
      const year = (g.academicYear || course?.academicYear || '2569').trim();
      const sem = (g.semester || course?.semester || (isPrimary ? 'annual' : '1')).trim();
      const key = `${year}|${sem}`;
      const existing = grouped.get(key) || { academicYear: year, semester: sem, items: [] };
      existing.items.push(g);
      grouped.set(key, existing);
    }

    const sortedGroups = Array.from(grouped.entries()).sort(([, a], [, b]) => {
      const yDiff = Number(a.academicYear || 0) - Number(b.academicYear || 0);
      if (yDiff !== 0) return yDiff;
      return parseSemesterOrder(a.semester) - parseSemesterOrder(b.semester);
    });

    let runningWeightedPoints = 0;
    let runningCredits = 0;

    const termPoints: SemesterTrendPoint[] = sortedGroups.map(([key, group]) => {
      let scoreSum = 0;
      let scoreCount = 0;
      let termWeightedPoints = 0;
      let termCredits = 0;
      const subjectsPreview: Array<{ code: string; title: string; score: number; letter: string }> = [];

      for (const g of group.items) {
        const course = courseById.get(g.courseId);
        const resolved = resolveEffectiveGrade(g, course, gradingSystem, false);
        const credits = course?.credits ?? 1;
        const activity = isActivityCourse(course) || resolved.isActivity;

        scoreSum += g.totalScore;
        scoreCount += 1;

        if (!isPrimary && !activity && !isSpecialMoeGrade(resolved.letter) && credits > 0) {
          termWeightedPoints += resolved.point * credits;
          termCredits += credits;
          runningWeightedPoints += resolved.point * credits;
          runningCredits += credits;
        }

        subjectsPreview.push({
          code: course?.code || g.courseId,
          title: course?.titleTh || course?.titleEn || '-',
          score: g.totalScore,
          letter: resolved.letter,
        });
      }

      const averageScore =
        scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;
      const termGpa =
        !isPrimary && termCredits > 0
          ? Math.round((termWeightedPoints / termCredits) * 100) / 100
          : null;
      const cumulativeGpax =
        !isPrimary && runningCredits > 0
          ? Math.round((runningWeightedPoints / runningCredits) * 100) / 100
          : null;
      const feedback = getRawScoreFeedback(averageScore);

      return {
        termKey: key,
        termLabel: formatTermLabel(group.academicYear, group.semester, isPrimary),
        academicYear: group.academicYear,
        semester: group.semester,
        averageScore,
        termGpa,
        cumulativeGpax,
        subjectCount: group.items.length,
        creditsCount: termCredits,
        feedbackTh: feedback.labelTh,
        subjectsPreview,
      };
    });

    return {
      points: termPoints,
      hasMultipleTerms: termPoints.length > 1,
    };
  }, [grades, student.id, courseById, gradingSystem, isPrimary]);

  const effectiveMode = isPrimary ? 'score' : metricMode;

  const latestPoint = points[points.length - 1];
  const previousPoint = points.length >= 2 ? points[points.length - 2] : null;
  const deltaText = useMemo(() => {
    if (!latestPoint || !previousPoint) return null;
    if (effectiveMode === 'gpa' && latestPoint.termGpa !== null && previousPoint.termGpa !== null) {
      const diff = Math.round((latestPoint.termGpa - previousPoint.termGpa) * 100) / 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} GPA`;
    }
    const diff = Math.round((latestPoint.averageScore - previousPoint.averageScore) * 10) / 10;
    return `${diff >= 0 ? '+' : ''}${diff}%`;
  }, [latestPoint, previousPoint, effectiveMode]);

  return (
    <div className="p-4 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
            <h4 className="text-xs font-bold text-[var(--color-text-title)]">
              {isPrimary
                ? 'แนวโน้มพัฒนาการคะแนนเฉลี่ยรายปี/ภาคเรียน (%)'
                : 'กราฟเส้นแนวโน้มผลการเรียนข้ามภาคเรียน (Academic Progress Trend)'}
            </h4>
            {deltaText && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  deltaText.startsWith('-')
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                }`}
              >
                เทียบภาคก่อน: {deltaText}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {isPrimary
              ? 'ติดตามคะแนนเฉลี่ย (%) และระดับพัฒนาการต่อเนื่อง (ไม่ใช้ GPA ตามเกณฑ์ประถม)'
              : 'เปรียบเทียบเกรดเฉลี่ยประจำภาค (Term GPA) และเกรดเฉลี่ยสะสม (GPAX) หรือคะแนนเฉลี่ย (%)'}
          </p>
        </div>

        {!isPrimary && points.length > 0 && (
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setMetricMode('gpa')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                effectiveMode === 'gpa'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              GPA / GPAX
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('score')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                effectiveMode === 'score'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
              }`}
            >
              คะแนนดิบ (%)
            </button>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-[var(--color-text-muted)]">
          <BookOpen className="w-7 h-7 mb-1.5 opacity-50" />
          <p className="text-xs font-semibold">ยังไม่มีประวัติผลการเรียนสำหรับสร้างกราฟแนวโน้ม</p>
        </div>
      ) : (
        <>
          <div className={`w-full min-w-0 ${compact ? 'h-[190px]' : 'h-[230px]'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 16, left: -14, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.5} />
                <XAxis
                  dataKey="termLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                />
                {effectiveMode === 'gpa' ? (
                  <YAxis
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                  />
                ) : (
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                )}
                <Tooltip content={<StudentTrendTooltip isPrimary={isPrimary} mode={effectiveMode} />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 8, fontSize: 11 }}
                />
                {effectiveMode === 'gpa' ? (
                  <>
                    <ReferenceLine y={2.0} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="termGpa"
                      name="GPA ประจำภาค"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeGpax"
                      name="GPAX สะสม"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      strokeDasharray="4 2"
                      dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </>
                ) : (
                  <>
                    <ReferenceLine
                      y={80}
                      stroke="#0284c7"
                      strokeDasharray="4 4"
                      label={{ value: 'ดีเยี่ยม 80%', position: 'insideTopLeft', fill: '#0284c7', fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="averageScore"
                      name="คะแนนเฉลี่ย (%)"
                      stroke="#0284c7"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {!hasMultipleTerms && (
            <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
              <span>
                พบผลการเรียน {points[0].subjectCount} รายวิชาใน {points[0].termLabel} — เมื่อบันทึกผลการเรียนภาคเรียนถัดไป กราฟเส้นแนวโน้มจะเชื่อมต่อต่อเนื่องอัตโนมัติ
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
};

interface StudentTrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SemesterTrendPoint }>;
  isPrimary: boolean;
  mode: 'gpa' | 'score';
}

const StudentTrendTooltip: React.FC<StudentTrendTooltipProps> = ({ active, payload, isPrimary, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-lg text-xs space-y-1.5 min-w-52">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-1">
        <span className="font-bold text-[var(--color-text-title)]">{row.termLabel}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{row.subjectCount} รายวิชา</span>
      </div>

      {!isPrimary && mode === 'gpa' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold">GPA ประจำภาค:</span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {row.termGpa !== null ? row.termGpa.toFixed(2) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">GPAX สะสม:</span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">
              {row.cumulativeGpax !== null ? row.cumulativeGpax.toFixed(2) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[var(--color-text-muted)]">
            <span>คะแนนเฉลี่ย (%):</span>
            <span className="font-mono font-semibold">{row.averageScore}%</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sky-700 dark:text-sky-300 font-semibold">คะแนนเฉลี่ย:</span>
            <span className="font-mono font-bold text-[var(--color-text-title)]">{row.averageScore}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">ระดับพัฒนาการ:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{row.feedbackTh}</span>
          </div>
        </div>
      )}

      {row.subjectsPreview.length > 0 && (
        <div className="pt-1 border-t border-[var(--color-border)] space-y-0.5 text-[10px]">
          {row.subjectsPreview.slice(0, 4).map((s) => (
            <div key={s.code} className="flex items-center justify-between gap-2 text-[var(--color-text-muted)]">
              <span className="truncate">{s.code} {s.title}</span>
              <span className="font-mono font-bold text-[var(--color-text-title)] shrink-0">
                {s.score}%{isPrimary ? '' : ` (${s.letter})`}
              </span>
            </div>
          ))}
          {row.subjectsPreview.length > 4 && (
            <p className="text-[9px] text-[var(--color-text-muted)] italic">
              +{row.subjectsPreview.length - 4} รายวิชาเพิ่มเติม
            </p>
          )}
        </div>
      )}
    </div>
  );
};
