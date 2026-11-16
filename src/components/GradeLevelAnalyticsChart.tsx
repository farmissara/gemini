import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  GraduationCap,
  Users,
  CheckCircle2,
  Award,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  Course,
  GradeRecord,
  Student,
  SystemConfig,
} from '../types';
import {
  calculateStudentAcademicSummary,
  detectEducationStage,
  getRawScoreFeedback,
  isPrimaryStage,
} from '../lib/moeGrading';

interface GradeLevelAnalyticsChartProps {
  students: Student[];
  attendance: AttendanceRecord[];
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  lang?: AppLanguage;
}

type StageFilter = 'all' | 'primary' | 'secondary';

interface GradeLevelDatum {
  gradeLevel: string;
  stage: ReturnType<typeof detectEducationStage>;
  isPrimary: boolean;
  studentCount: number;
  attendanceRate: number;
  punctualityRate: number;
  attendanceRecordsCount: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  academicPerformance: number;
  gradedStudentCount: number;
  avgGpax: number | null;
  feedbackTh: string;
  feedbackEn: string;
}

function getGradeLevelSortOrder(gradeLevel: string): number {
  const s = gradeLevel.trim().toLowerCase().replace(/\s+/g, '');

  const kindy = s.match(/(?:อ\.?|k\.?)([1-3])/);
  if (kindy) return 10 + Number(kindy[1]);

  const thaiPrimary = s.match(/(?:ป\.?|ประถม(?:ศึกษาปีที่)?)([1-6])/);
  if (thaiPrimary) return 20 + Number(thaiPrimary[1]);

  const engPrimary = s.match(/(?:p\.?|primary)([1-6])/);
  if (engPrimary) return 20 + Number(engPrimary[1]);

  const gradePrimary = s.match(/^grade([1-6])$/);
  if (gradePrimary) return 20 + Number(gradePrimary[1]);

  const thaiSecondary = s.match(/(?:ม\.?|มัธยม(?:ศึกษาปีที่)?)([1-6])/);
  if (thaiSecondary) return 30 + Number(thaiSecondary[1]);

  const engSecondary = s.match(/(?:m\.?|secondary)([1-6])/);
  if (engSecondary) return 30 + Number(engSecondary[1]);

  const gradeSecondary = s.match(/^grade(7|8|9|10|11|12)$/);
  if (gradeSecondary) return 30 + (Number(gradeSecondary[1]) - 6);

  const voc = s.match(/(?:ปวช\.?|ปวส\.?)([1-3])/);
  if (voc) return 50 + Number(voc[1]);

  return 99;
}

export const GradeLevelAnalyticsChart: React.FC<GradeLevelAnalyticsChartProps> = ({
  students,
  attendance,
  courses,
  grades,
  systemConfig,
  lang = 'th',
}) => {
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');

  const gradeLevelData = useMemo<GradeLevelDatum[]>(() => {
    const activeStudents = students.filter((s) => s.status !== 'graduated' && s.status !== 'transferred');
    const sourceStudents = activeStudents.length > 0 ? activeStudents : students;

    const studentById = new Map<string, Student>();
    const studentsByLevel = new Map<string, Student[]>();

    for (const student of sourceStudents) {
      studentById.set(student.id, student);
      const level = (student.gradeLevel || '').trim() || (lang === 'th' ? 'ไม่ระบุชั้น' : 'Unassigned');
      const group = studentsByLevel.get(level) || [];
      group.push(student);
      studentsByLevel.set(level, group);
    }

    // Group student check-in records by grade level
    const attendanceByLevel = new Map<
      string,
      { present: number; late: number; leave: number; absent: number }
    >();

    for (const rec of attendance) {
      if (rec.userType === 'teacher' || rec.recordType === 'check_out') continue;
      const stu = studentById.get(rec.studentId);
      const level =
        (stu?.gradeLevel || '').trim() ||
        (rec.userDepartmentOrRoom ? rec.userDepartmentOrRoom.split('/')[0]?.trim() : '') ||
        '';
      if (!level || !studentsByLevel.has(level)) continue;

      const bucket = attendanceByLevel.get(level) || { present: 0, late: 0, leave: 0, absent: 0 };
      if (rec.status === 'present') bucket.present += 1;
      else if (rec.status === 'late') bucket.late += 1;
      else if (rec.status === 'leave') bucket.leave += 1;
      else if (rec.status === 'absent') bucket.absent += 1;
      attendanceByLevel.set(level, bucket);
    }

    const rows: GradeLevelDatum[] = [];

    for (const [level, levelStudents] of studentsByLevel.entries()) {
      const stage = detectEducationStage(level);
      const primary = isPrimaryStage(stage);

      const attBucket = attendanceByLevel.get(level) || {
        present: 0,
        late: 0,
        leave: 0,
        absent: 0,
      };
      const totalAttRecords =
        attBucket.present + attBucket.late + attBucket.leave + attBucket.absent;
      const attended = attBucket.present + attBucket.late;
      const attendanceRate =
        totalAttRecords > 0 ? Math.round((attended / totalAttRecords) * 1000) / 10 : 0;
      const punctualityRate =
        attended > 0 ? Math.round((attBucket.present / attended) * 1000) / 10 : 0;

      // Academic performance via MOE grading helper (respects primary yearly raw score vs secondary semester GPAX)
      let scoreSum = 0;
      let scoreCount = 0;
      let gpaxSum = 0;
      let gpaxCount = 0;

      for (const student of levelStudents) {
        const summary = calculateStudentAcademicSummary({
          student,
          courses,
          grades,
          gradingSystem: systemConfig.gradingSystem,
          currentAcademicYear: systemConfig.academicYear,
          currentSemester: systemConfig.currentSemester,
        });

        if (summary.averageRawScore !== null) {
          scoreSum += summary.averageRawScore;
          scoreCount += 1;
        } else if (!primary && summary.gpax !== null && summary.gpax > 0) {
          scoreSum += Math.min(100, Math.round((summary.gpax / 4) * 1000) / 10);
          scoreCount += 1;
        }

        if (!primary && summary.gpax !== null) {
          gpaxSum += summary.gpax;
          gpaxCount += 1;
        }
      }

      const academicPerformance =
        scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;
      const avgGpax =
        !primary && gpaxCount > 0 ? Math.round((gpaxSum / gpaxCount) * 100) / 100 : null;
      const feedback = getRawScoreFeedback(scoreCount > 0 ? academicPerformance : null);

      rows.push({
        gradeLevel: level,
        stage,
        isPrimary: primary,
        studentCount: levelStudents.length,
        attendanceRate,
        punctualityRate,
        attendanceRecordsCount: totalAttRecords,
        presentCount: attBucket.present,
        lateCount: attBucket.late,
        leaveCount: attBucket.leave,
        absentCount: attBucket.absent,
        academicPerformance,
        gradedStudentCount: scoreCount,
        avgGpax,
        feedbackTh: feedback.labelTh,
        feedbackEn: feedback.labelEn,
      });
    }

    rows.sort((a, b) => {
      const orderDiff = getGradeLevelSortOrder(a.gradeLevel) - getGradeLevelSortOrder(b.gradeLevel);
      if (orderDiff !== 0) return orderDiff;
      return a.gradeLevel.localeCompare(b.gradeLevel, 'th');
    });

    return rows;
  }, [students, attendance, courses, grades, systemConfig, lang]);

  const filteredData = useMemo(() => {
    if (stageFilter === 'primary') {
      return gradeLevelData.filter((d) => d.isPrimary);
    }
    if (stageFilter === 'secondary') {
      return gradeLevelData.filter((d) => !d.isPrimary && d.stage !== 'kindergarten');
    }
    return gradeLevelData;
  }, [gradeLevelData, stageFilter]);

  const overviewStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgAttendance: 0,
        avgAcademic: 0,
        totalStudents: 0,
        gradeCount: 0,
      };
    }
    const withAtt = filteredData.filter((d) => d.attendanceRecordsCount > 0);
    const withAcad = filteredData.filter((d) => d.gradedStudentCount > 0);
    const avgAttendance =
      withAtt.length > 0
        ? Math.round((withAtt.reduce((s, d) => s + d.attendanceRate, 0) / withAtt.length) * 10) / 10
        : 0;
    const avgAcademic =
      withAcad.length > 0
        ? Math.round((withAcad.reduce((s, d) => s + d.academicPerformance, 0) / withAcad.length) * 10) /
          10
        : 0;
    const totalStudents = filteredData.reduce((s, d) => s + d.studentCount, 0);
    return {
      avgAttendance,
      avgAcademic,
      totalStudents,
      gradeCount: filteredData.length,
    };
  }, [filteredData]);

  return (
    <section
      aria-label={lang === 'th' ? 'กราฟเปรียบเทียบการมาเรียนและผลสัมฤทธิ์' : 'Comparison Charts'}
      className="frosted-card frosted-amber dash-card dash-card-stack print-avoid-break"
    >
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 dash-header-divider border-b border-amber-200/75 dark:border-amber-800/50">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100/95 dark:bg-amber-950/60 border border-amber-300/70 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 tracking-wide">
              Comparison Charts · มาตรฐาน ศธ.
            </p>
            <h3 className="text-base font-bold text-[#0f172a] dark:text-slate-100 leading-snug">
              {lang === 'th'
                ? 'เปรียบเทียบการมาเรียนและผลสัมฤทธิ์รายระดับชั้น'
                : 'Attendance & Academic Comparison'}
            </h3>
            <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5">
              {lang === 'th'
                ? 'ป.1–ป.6 ประเมินคะแนนดิบรายปี · ม.1–ม.6 ประเมินผลการเรียนรายภาค'
                : 'Primary yearly raw scores · Secondary semester grades'}
            </p>
          </div>
        </div>

        {/* Grade Level Filter Segmented Control */}
        <div
          role="tablist"
          aria-label={lang === 'th' ? 'กรองระดับชั้น' : 'Filter grade stage'}
          className="no-print inline-flex items-center rounded-xl border border-amber-300/80 dark:border-amber-800/60 bg-white/80 dark:bg-slate-900/65 p-1 text-xs font-medium self-start xl:self-auto shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'all'}
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-semibold whitespace-nowrap ${
              stageFilter === 'all'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-[#1e293b] dark:text-slate-200 hover:bg-amber-50/90 dark:hover:bg-amber-950/40'
            }`}
          >
            {lang === 'th' ? 'ทุกระดับชั้น' : 'All Grades'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'primary'}
            onClick={() => setStageFilter('primary')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-semibold whitespace-nowrap ${
              stageFilter === 'primary'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-[#1e293b] dark:text-slate-200 hover:bg-amber-50/90 dark:hover:bg-amber-950/40'
            }`}
          >
            {lang === 'th' ? 'ป.1–ป.6' : 'Primary'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={stageFilter === 'secondary'}
            onClick={() => setStageFilter('secondary')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-semibold whitespace-nowrap ${
              stageFilter === 'secondary'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-[#1e293b] dark:text-slate-200 hover:bg-amber-50/90 dark:hover:bg-amber-950/40'
            }`}
          >
            {lang === 'th' ? 'ม.1–ม.6' : 'Secondary'}
          </button>
        </div>
        <span className="hidden print:inline-block text-xs font-semibold text-amber-900">
          {lang === 'th'
            ? `ขอบเขต: ${stageFilter === 'all' ? 'ทุกระดับชั้น' : stageFilter === 'primary' ? 'ป.1–ป.6' : 'ม.1–ม.6'}`
            : `Scope: ${stageFilter === 'all' ? 'All Grades' : stageFilter === 'primary' ? 'Primary' : 'Secondary'}`}
        </span>
      </div>

      {/* Clean Unboxed KPI Summary Strip (separated by subtle hairline dividers) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0 sm:divide-x sm:divide-amber-200/75 dark:sm:divide-amber-800/50 bg-white/60 dark:bg-slate-900/45 rounded-xl dash-kpi-strip border border-amber-200/60 dark:border-amber-800/40">
        <div className="sm:pr-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
              {lang === 'th' ? 'อัตราการมาเรียนเฉลี่ย' : 'Avg. Attendance'}
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
              {overviewStats.avgAttendance}%
            </p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div className="sm:px-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
              {lang === 'th' ? 'ผลสัมฤทธิ์เฉลี่ย' : 'Avg. Academic'}
            </p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-0.5 tabular-nums">
              {overviewStats.avgAcademic}%
            </p>
          </div>
          <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        </div>

        <div className="sm:pl-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] dark:text-slate-300">
              {lang === 'th' ? 'ขอบเขตข้อมูล' : 'Coverage'}
            </p>
            <p className="text-sm font-bold text-[#1e293b] dark:text-slate-100 mt-0.5 tabular-nums">
              {overviewStats.gradeCount} {lang === 'th' ? 'ชั้น' : 'grades'} · {overviewStats.totalStudents}{' '}
              {lang === 'th' ? 'คน' : 'students'}
            </p>
          </div>
          <Users className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="w-full h-[245px] min-w-0">
        {filteredData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#475569] dark:text-slate-300">
            <GraduationCap className="w-9 h-9 mb-2 opacity-55 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-[#1e293b] dark:text-slate-100">
              {lang === 'th'
                ? 'ยังไม่มีข้อมูลนักเรียนในระดับชั้นที่เลือก'
                : 'No student data for the selected grade filter'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 12, right: 12, left: -14, bottom: 4 }}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.55} />
              <XAxis
                dataKey="gradeLevel"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<GradeLevelTooltip lang={lang} />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />
              <ReferenceLine
                y={80}
                stroke="#d97706"
                strokeDasharray="4 4"
                label={{
                  value: lang === 'th' ? 'เกณฑ์ 80%' : '80% Goal',
                  position: 'insideTopLeft',
                  fill: '#b45309',
                  fontSize: 10,
                }}
              />
              <Bar
                dataKey="attendanceRate"
                name={lang === 'th' ? 'อัตราการมาเรียน (%)' : 'Attendance Rate (%)'}
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={34}
              />
              <Bar
                dataKey="academicPerformance"
                name={lang === 'th' ? 'ผลสัมฤทธิ์ทางการเรียน (%)' : 'Academic Performance (%)'}
                fill="#4f46e5"
                radius={[6, 6, 0, 0]}
                maxBarSize={34}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

interface GradeLevelTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GradeLevelDatum }>;
  lang: AppLanguage;
}

const GradeLevelTooltip: React.FC<GradeLevelTooltipProps> = ({ active, payload, lang }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-lg text-xs space-y-2 min-w-56">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-1.5">
        <div>
          <p className="font-bold text-[var(--color-text-title)] text-sm">{row.gradeLevel}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {row.isPrimary
              ? lang === 'th'
                ? 'ประเมินรายปี (ไม่เน้น GPA)'
                : 'Primary Yearly Evaluation'
              : lang === 'th'
              ? 'ประเมินรายภาคเรียน'
              : 'Secondary Semester Evaluation'}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-card-subtle)] border border-[var(--color-border)] font-bold text-[10px] text-[var(--color-text-title)]">
          {row.studentCount} {lang === 'th' ? 'คน' : 'students'}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] inline-block" />
            {lang === 'th' ? 'อัตราการมาเรียน:' : 'Attendance Rate:'}
          </span>
          <span className="font-mono font-bold text-[var(--color-text-title)]">
            {row.attendanceRate}%
          </span>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] pl-4">
          {row.attendanceRecordsCount > 0
            ? lang === 'th'
              ? `ตรงเวลา ${row.presentCount} • สาย ${row.lateCount} • ลา ${row.leaveCount} • ขาด ${row.absentCount}`
              : `On-time ${row.presentCount} • Late ${row.lateCount} • Leave ${row.leaveCount} • Absent ${row.absentCount}`
            : lang === 'th'
            ? 'ยังไม่มีบันทึกการเช็คชื่อในชั้นนี้'
            : 'No check-in logs recorded'}
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#4f46e5] inline-block" />
            {lang === 'th' ? 'ผลสัมฤทธิ์ (%):' : 'Academic Score:'}
          </span>
          <span className="font-mono font-bold text-[var(--color-text-title)]">
            {row.gradedStudentCount > 0 ? `${row.academicPerformance}%` : '-'}
          </span>
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] pl-4">
          {row.gradedStudentCount > 0 ? (
            row.isPrimary ? (
              lang === 'th' ? (
                `พัฒนาการ: ${row.feedbackTh} (ซ่อนเกรดเฉลี่ย GPA ตามเกณฑ์ประถม)`
              ) : (
                `Level: ${row.feedbackEn} (GPA hidden for Primary)`
              )
            ) : row.avgGpax !== null ? (
              lang === 'th' ? (
                `GPAX เฉลี่ย: ${row.avgGpax.toFixed(2)} / 4.00 (${row.feedbackTh})`
              ) : (
                `Avg GPAX: ${row.avgGpax.toFixed(2)} / 4.00 (${row.feedbackEn})`
              )
            ) : (
              `${row.feedbackTh}`
            )
          ) : lang === 'th' ? (
            'ยังไม่มีคะแนนผลการเรียนที่บันทึก'
          ) : (
            'No academic grades recorded yet'
          )}
        </p>
      </div>
    </div>
  );
};
