import React, { useMemo, useRef, useState } from 'react';
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
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  Course,
  GradeRecord,
  School,
  Student,
  SystemConfig,
} from '../types';
import { resolveMoeLearningArea } from '../data/moeCurriculumStandards';
import { isActivityCourse, resolveEffectiveGrade } from '../lib/moeGrading';
import { getCourseType } from '../lib/courseClassification';
import {
  readLocalIndicatorScores,
  readLocalIndicatorSets,
} from '../lib/learningIndicatorStore';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';
import { StatusBadge } from './common/StatusBadge';
import { PaginatedTableRows } from './common/PaginatedTableRows';

interface Pp5CoreRoomSummaryViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  school?: School;
  lang?: AppLanguage;
  onOpenCoursePp5?: (courseId: string) => void;
}

interface StudentRosterEvaluation {
  grade: GradeRecord;
  student: Student;
  room: string;
  formativeScore: number; // midterm + assignment + quiz (max 60)
  formativePct: number;
  finalScore: number;
  totalScore: number;
  letter: string;
  point: number;
  countsInGpa: boolean;
  isSpecial: boolean;
  indicatorPassed: boolean;
  indicatorReason: string;
  indicatorSource: 'indicators_and_grade' | 'grade_record';
}

interface RoomCoursePp5Summary {
  key: string;
  room: string;
  gradeLevel: string;
  course: Course;
  areaShortTh: string;
  areaNameTh: string;
  studentCount: number;
  avgFormative: number;
  avgFinal: number;
  avgTotalScore: number;
  minScore: number;
  maxScore: number;
  stdDev: number;
  avgGpa: number;
  indicatorPassedCount: number;
  indicatorFailedCount: number;
  indicatorPassPct: number;
  passCount: number;
  passPct: number;
  goodOrAboveCount: number;
  goodOrAbovePct: number;
  dist: {
    g4: number;
    g35: number;
    g3: number;
    g25: number;
    g2: number;
    g15: number;
    g1: number;
    g0: number;
    special: number;
  };
  roster: StudentRosterEvaluation[];
}

interface RoomAggregateSummary {
  room: string;
  gradeLevel: string;
  courseCount: number;
  recordCount: number;
  avgTotalScore: number;
  avgGpa: number;
  indicatorPassedCount: number;
  indicatorFailedCount: number;
  indicatorPassPct: number;
  passPct: number;
  goodOrAbovePct: number;
  specialCount: number;
}

function classifyCourseType(course: Course): 'core' | 'elective' | 'activity' {
  if (isActivityCourse(course)) return 'activity';
  const courseType = getCourseType(course);
  if (courseType === 'core') return 'core';
  if (courseType === 'elective') return 'elective';
  const title = (course.titleTh || '').trim();
  const dept = (course.department || '').trim();

  if (title.includes('พื้นฐาน') || dept.includes('พื้นฐาน')) return 'core';
  if (title.includes('เพิ่มเติม') || dept.includes('เพิ่มเติม')) return 'elective';

  const normalizedCode = (course.code || '').trim().replace(/\s+/g, '');
  if (/^[ก-ฮ]\d{2}2\d{2}$/.test(normalizedCode)) return 'elective';
  if (/^[ก-ฮ]\d{2}1\d{2}$/.test(normalizedCode)) return 'core';
  return 'core';
}

export const Pp5CoreRoomSummaryView: React.FC<Pp5CoreRoomSummaryViewProps> = ({
  students,
  courses,
  grades,
  systemConfig,
  school,
  lang = 'th',
  onOpenCoursePp5,
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';

  const [courseScope, setCourseScope] = useState<'all' | 'core' | 'elective'>('all');
  const [courseFilterId, setCourseFilterId] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [passThresholdPct, setPassThresholdPct] = useState<50 | 60>(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'room_course_table' | 'room_overview' | 'class_roster'>('room_course_table');
  const [selectedRosterKey, setSelectedRosterKey] = useState<string>('');
  const printSheetRef = useRef<HTMLDivElement>(null);

  const scopedCourses = useMemo(
    () =>
      courses
        .filter((c) => {
          const kind = classifyCourseType(c);
          if (kind === 'activity') return false;
          if (courseScope === 'core') return kind === 'core';
          if (courseScope === 'elective') return kind === 'elective';
          return true;
        })
        .sort((a, b) => a.code.localeCompare(b.code, 'th')),
    [courses, courseScope]
  );

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    scopedCourses.forEach((c) => map.set(c.id, c));
    return map;
  }, [scopedCourses]);

  // Cache local learning indicator sets & scores per course when available
  const indicatorFailureMapByCourse = useMemo(() => {
    const out = new Map<string, Map<string, { hasRecords: boolean; failedCount: number; totalCount: number }>>();
    scopedCourses.forEach((course) => {
      const sets = readLocalIndicatorSets(schoolId, course.id);
      if (sets.length === 0) return;
      const perStudent = new Map<string, { hasRecords: boolean; failedCount: number; totalCount: number }>();
      sets.forEach((set) => {
        const scores = readLocalIndicatorScores(schoolId, set.id);
        scores.forEach((sc) => {
          const ind = set.indicators.find((i) => i.id === sc.indicatorId);
          const maxScore = ind?.maxScore || 10;
          const prev = perStudent.get(sc.studentId) || { hasRecords: true, failedCount: 0, totalCount: 0 };
          prev.totalCount += 1;
          if (sc.result === 'not_pass' || sc.score < maxScore * (passThresholdPct / 100)) {
            prev.failedCount += 1;
          }
          perStudent.set(sc.studentId, prev);
        });
      });
      if (perStudent.size > 0) {
        out.set(course.id, perStudent);
      }
    });
    return out;
  }, [scopedCourses, schoolId, passThresholdPct]);

  const roomCourseRows = useMemo<RoomCoursePp5Summary[]>(() => {
    type Bucket = {
      room: string;
      gradeLevel: string;
      course: Course;
      items: Array<{ grade: GradeRecord; student: Student }>;
    };
    const buckets = new Map<string, Bucket>();

    grades.forEach((grade) => {
      const course = courseById.get(grade.courseId);
      if (!course) return;
      const student = studentById.get(grade.studentId);
      if (!student) return;

      const room = (student.room || course.room || 'ไม่ระบุห้อง').trim();
      const gradeLevel = (student.gradeLevel || '').trim();
      const key = `${room}::${course.id}`;
      const existing = buckets.get(key) || { room, gradeLevel, course, items: [] };
      existing.items.push({ grade, student });
      buckets.set(key, existing);
    });

    const summaries: RoomCoursePp5Summary[] = [];
    buckets.forEach((bucket) => {
      const n = bucket.items.length;
      if (n === 0) return;

      const totals = bucket.items.map((x) => Number(x.grade.totalScore || 0));
      const formatives = bucket.items.map(
        (x) =>
          Number(x.grade.midtermScore || 0) +
          Number(x.grade.assignmentScore || 0) +
          Number(x.grade.quizScore || 0)
      );
      const finals = bucket.items.map((x) => Number(x.grade.finalScore || 0));

      const avgFormative = Math.round((formatives.reduce((a, b) => a + b, 0) / n) * 10) / 10;
      const avgFinal = Math.round((finals.reduce((a, b) => a + b, 0) / n) * 10) / 10;
      const avgTotalScore = Math.round((totals.reduce((a, b) => a + b, 0) / n) * 10) / 10;
      const minScore = Math.min(...totals);
      const maxScore = Math.max(...totals);
      const variance = totals.reduce((acc, s) => acc + Math.pow(s - avgTotalScore, 2), 0) / n;
      const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

      const dist = { g4: 0, g35: 0, g3: 0, g25: 0, g2: 0, g15: 0, g1: 0, g0: 0, special: 0 };
      let gpaSum = 0;
      let gpaCount = 0;
      let passCount = 0;
      let goodOrAboveCount = 0;
      let indicatorPassedCount = 0;
      let indicatorFailedCount = 0;

      const courseIndicatorMap = indicatorFailureMapByCourse.get(bucket.course.id);
      const roster: StudentRosterEvaluation[] = [];

      bucket.items.forEach(({ grade, student }) => {
        const eff = resolveEffectiveGrade(grade, bucket.course, systemConfig.gradingSystem);
        const formativeScore =
          Number(grade.midtermScore || 0) +
          Number(grade.assignmentScore || 0) +
          Number(grade.quizScore || 0);
        const formativePct = Math.round((formativeScore / 60) * 100);
        const totalScore = Number(grade.totalScore || 0);
        const realInd = courseIndicatorMap?.get(student.id);

        let indicatorPassed = false;
        let indicatorReason = '';
        let indicatorSource: StudentRosterEvaluation['indicatorSource'] = 'grade_record';

        if (realInd && realInd.hasRecords) {
          indicatorSource = 'indicators_and_grade';
          if (eff.isSpecial) {
            indicatorPassed = false;
            indicatorReason = `ติดสถานะ ${eff.letter}`;
          } else if (realInd.failedCount > 0) {
            indicatorPassed = false;
            indicatorReason = `ไม่ผ่าน ${realInd.failedCount}/${realInd.totalCount} ตัวชี้วัด`;
          } else if (totalScore < passThresholdPct) {
            indicatorPassed = false;
            indicatorReason = `คะแนนรวมต่ำกว่า ${passThresholdPct}%`;
          } else {
            indicatorPassed = true;
            indicatorReason = `ผ่านครบ ${realInd.totalCount} ตัวชี้วัด`;
          }
        } else {
          if (eff.isSpecial) {
            indicatorPassed = false;
            indicatorReason = `ติดสถานะ ${eff.letter}`;
          } else if (totalScore < passThresholdPct) {
            indicatorPassed = false;
            indicatorReason = `คะแนนรวม ${totalScore} < ${passThresholdPct}`;
          } else if (formativePct < passThresholdPct) {
            indicatorPassed = false;
            indicatorReason = `คะแนนเก็บระหว่างภาค ${formativePct}% < ${passThresholdPct}%`;
          } else {
            indicatorPassed = true;
            indicatorReason = `ผ่านเกณฑ์ตัวชี้วัด (≥${passThresholdPct}%)`;
          }
        }

        if (indicatorPassed) indicatorPassedCount += 1;
        else indicatorFailedCount += 1;

        roster.push({
          grade,
          student,
          room: bucket.room,
          formativeScore,
          formativePct,
          finalScore: Number(grade.finalScore || 0),
          totalScore,
          letter: eff.letter,
          point: eff.point,
          countsInGpa: eff.countsInGpa,
          isSpecial: eff.isSpecial,
          indicatorPassed,
          indicatorReason,
          indicatorSource,
        });

        if (eff.isSpecial || eff.letter === 'ร' || eff.letter === 'มส.') {
          dist.special += 1;
          return;
        }
        gpaSum += eff.point;
        gpaCount += 1;
        if (eff.point >= 1) passCount += 1;
        if (eff.point >= 3) goodOrAboveCount += 1;

        if (eff.point >= 4) dist.g4 += 1;
        else if (eff.point >= 3.5) dist.g35 += 1;
        else if (eff.point >= 3) dist.g3 += 1;
        else if (eff.point >= 2.5) dist.g25 += 1;
        else if (eff.point >= 2) dist.g2 += 1;
        else if (eff.point >= 1.5) dist.g15 += 1;
        else if (eff.point >= 1) dist.g1 += 1;
        else dist.g0 += 1;
      });

      roster.sort((a, b) => a.student.studentIdNumber.localeCompare(b.student.studentIdNumber, 'th'));

      const avgGpa = gpaCount > 0 ? Math.round((gpaSum / gpaCount) * 100) / 100 : 0;
      const area = resolveMoeLearningArea(bucket.course);

      summaries.push({
        key: `${bucket.room}::${bucket.course.id}`,
        room: bucket.room,
        gradeLevel: bucket.gradeLevel,
        course: bucket.course,
        areaShortTh: area.shortTh,
        areaNameTh: area.nameTh,
        studentCount: n,
        avgFormative,
        avgFinal,
        avgTotalScore,
        minScore,
        maxScore,
        stdDev,
        avgGpa,
        indicatorPassedCount,
        indicatorFailedCount,
        indicatorPassPct: Math.round((indicatorPassedCount / n) * 100),
        passCount,
        passPct: Math.round((passCount / n) * 100),
        goodOrAboveCount,
        goodOrAbovePct: Math.round((goodOrAboveCount / n) * 100),
        dist,
        roster,
      });
    });

    return summaries.sort(
      (a, b) => a.room.localeCompare(b.room, 'th') || a.course.code.localeCompare(b.course.code, 'th')
    );
  }, [grades, courseById, studentById, systemConfig.gradingSystem, indicatorFailureMapByCourse, passThresholdPct]);

  const roomOptions = useMemo(() => {
    return Array.from(new Set(roomCourseRows.map((r) => r.room))).sort((a, b) => a.localeCompare(b, 'th'));
  }, [roomCourseRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roomCourseRows.filter((row) => {
      if (courseFilterId !== 'all' && row.course.id !== courseFilterId) return false;
      if (roomFilter !== 'all' && row.room !== roomFilter) return false;
      if (!q) return true;
      return [row.room, row.gradeLevel, row.course.code, row.course.titleTh, row.areaNameTh]
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [roomCourseRows, courseFilterId, roomFilter, searchQuery]);

  const roomAggregateRows = useMemo<RoomAggregateSummary[]>(() => {
    const map = new Map<string, RoomCoursePp5Summary[]>();
    filteredRows.forEach((row) => {
      const arr = map.get(row.room) || [];
      arr.push(row);
      map.set(row.room, arr);
    });

    const out: RoomAggregateSummary[] = [];
    map.forEach((list, room) => {
      const totalRecords = list.reduce((acc, r) => acc + r.studentCount, 0);
      const weightedScore =
        totalRecords > 0
          ? list.reduce((acc, r) => acc + r.avgTotalScore * r.studentCount, 0) / totalRecords
          : 0;
      const weightedGpa =
        totalRecords > 0
          ? list.reduce((acc, r) => acc + r.avgGpa * r.studentCount, 0) / totalRecords
          : 0;
      const passSum = list.reduce((acc, r) => acc + r.passCount, 0);
      const goodSum = list.reduce((acc, r) => acc + r.goodOrAboveCount, 0);
      const indPassSum = list.reduce((acc, r) => acc + r.indicatorPassedCount, 0);
      const indFailSum = list.reduce((acc, r) => acc + r.indicatorFailedCount, 0);
      const specialSum = list.reduce((acc, r) => acc + r.dist.special + r.dist.g0, 0);

      out.push({
        room,
        gradeLevel: list[0]?.gradeLevel || '',
        courseCount: list.length,
        recordCount: totalRecords,
        avgTotalScore: Math.round(weightedScore * 10) / 10,
        avgGpa: Math.round(weightedGpa * 100) / 100,
        indicatorPassedCount: indPassSum,
        indicatorFailedCount: indFailSum,
        indicatorPassPct: totalRecords > 0 ? Math.round((indPassSum / totalRecords) * 100) : 0,
        passPct: totalRecords > 0 ? Math.round((passSum / totalRecords) * 100) : 0,
        goodOrAbovePct: totalRecords > 0 ? Math.round((goodSum / totalRecords) * 100) : 0,
        specialCount: specialSum,
      });
    });

    return out.sort((a, b) => a.room.localeCompare(b.room, 'th'));
  }, [filteredRows]);

  const overallSummary = useMemo(() => {
    const n = filteredRows.reduce((acc, r) => acc + r.studentCount, 0);
    if (n === 0) {
      return {
        courseGroups: 0,
        totalRecords: 0,
        avgScore: 0,
        avgGpa: 0,
        indicatorPassedTotal: 0,
        indicatorFailedTotal: 0,
        indicatorPassPct: 0,
        passPct: 0,
        goodPct: 0,
        specialOrZeroCount: 0,
      };
    }
    const avgScore =
      Math.round((filteredRows.reduce((acc, r) => acc + r.avgTotalScore * r.studentCount, 0) / n) * 10) / 10;
    const avgGpa =
      Math.round((filteredRows.reduce((acc, r) => acc + r.avgGpa * r.studentCount, 0) / n) * 100) / 100;
    const passCount = filteredRows.reduce((acc, r) => acc + r.passCount, 0);
    const goodCount = filteredRows.reduce((acc, r) => acc + r.goodOrAboveCount, 0);
    const indicatorPassedTotal = filteredRows.reduce((acc, r) => acc + r.indicatorPassedCount, 0);
    const indicatorFailedTotal = filteredRows.reduce((acc, r) => acc + r.indicatorFailedCount, 0);
    const specialOrZeroCount = filteredRows.reduce((acc, r) => acc + r.dist.g0 + r.dist.special, 0);

    return {
      courseGroups: filteredRows.length,
      totalRecords: n,
      avgScore,
      avgGpa,
      indicatorPassedTotal,
      indicatorFailedTotal,
      indicatorPassPct: Math.round((indicatorPassedTotal / n) * 100),
      passPct: Math.round((passCount / n) * 100),
      goodPct: Math.round((goodCount / n) * 100),
      specialOrZeroCount,
    };
  }, [filteredRows]);

  const activeRosterGroup = useMemo(() => {
    if (filteredRows.length === 0) return null;
    return filteredRows.find((r) => r.key === selectedRosterKey) || filteredRows[0];
  }, [filteredRows, selectedRosterKey]);

  const chartData = useMemo(() => {
    return roomAggregateRows.map((r) => ({
      name: r.room,
      avgScore: r.avgTotalScore,
      indicatorPassPct: r.indicatorPassPct,
      goodPct: r.goodOrAbovePct,
    }));
  }, [roomAggregateRows]);

  const handlePrint = () => {
    if (!printSheetRef.current) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `สรุปผลการประเมินรายวิชา ปพ.5 รวมทั้งห้องเรียน - ${school?.nameTh || systemConfig.schoolNameTh}`
    );
  };

  const handleExportCsv = () => {
    const bom = '\uFEFF';
    if (viewMode === 'class_roster' && activeRosterGroup) {
      const headers = [
        'รหัสนักเรียน',
        'ชื่อ-นามสกุล',
        'ห้องเรียน',
        'กลางภาค (30)',
        'งาน/การบ้าน (20)',
        'ทดสอบ (10)',
        'รวมระหว่างภาค (60)',
        'ปลายภาค (40)',
        'คะแนนรวม (100)',
        'ระดับผลการเรียน',
        'ผลตัวชี้วัด',
        'หมายเหตุตัวชี้วัด',
      ];
      const lines = activeRosterGroup.roster.map((item) =>
        [
          `"${item.student.studentIdNumber}"`,
          `"${item.student.firstNameTh} ${item.student.lastNameTh}"`,
          `"${item.room}"`,
          item.grade.midtermScore,
          item.grade.assignmentScore,
          item.grade.quizScore,
          item.formativeScore,
          item.finalScore,
          item.totalScore,
          `"${item.letter}"`,
          item.indicatorPassed ? '"ผ่านตัวชี้วัด"' : '"ไม่ผ่านตัวชี้วัด"',
          `"${item.indicatorReason}"`,
        ].join(',')
      );
      const blob = new Blob([bom + [headers.join(','), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pp5_class_roster_${activeRosterGroup.course.code}_${activeRosterGroup.room}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      'ห้องเรียน',
      'รหัสวิชา',
      'ชื่อรายวิชา',
      'กลุ่มสาระฯ',
      'จำนวนนักเรียน',
      'เฉลี่ยระหว่างเรียน',
      'เฉลี่ยปลายภาค',
      'คะแนนรวมเฉลี่ย',
      'S.D.',
      'เกรดเฉลี่ยรายห้อง (GPA)',
      'ผ่านตัวชี้วัด (คน)',
      'ไม่ผ่านตัวชี้วัด (คน)',
      'ร้อยละผ่านตัวชี้วัด',
      'เกรด 4',
      '3.5',
      '3',
      '2.5',
      '2',
      '1.5',
      '1',
      '0',
      'ร/มส.',
    ];
    const lines = filteredRows.map((r) =>
      [
        `"${r.room}"`,
        `"${r.course.code}"`,
        `"${r.course.titleTh}"`,
        `"${r.areaNameTh}"`,
        r.studentCount,
        r.avgFormative.toFixed(1),
        r.avgFinal.toFixed(1),
        r.avgTotalScore.toFixed(1),
        r.stdDev.toFixed(1),
        r.avgGpa.toFixed(2),
        r.indicatorPassedCount,
        r.indicatorFailedCount,
        `${r.indicatorPassPct}%`,
        r.dist.g4,
        r.dist.g35,
        r.dist.g3,
        r.dist.g25,
        r.dist.g2,
        r.dist.g15,
        r.dist.g1,
        r.dist.g0,
        r.dist.special,
      ].join(',')
    );
    const blob = new Blob([bom + [headers.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pp5_classroom_summary_${academicYear}_${semester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="saas-card saas-card-body flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
            <h2 className="text-base font-bold text-[var(--color-text-title)] truncate">
              {lang === 'th'
                ? 'รายงานสรุปผลการประเมินคะแนนรายวิชา (ปพ.5) รวมทั้งห้องเรียน'
                : 'OBEC Pp.5 Whole-Classroom Evaluation & Indicator Summary'}
            </h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            คำนวณเกรดเฉลี่ยรายห้องและจำนวนนักเรียนที่ผ่าน/ไม่ผ่านตัวชี้วัดอัตโนมัติจาก GradeRecord · {formatSemesterLabel(semester)} ปีการศึกษา {academicYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            <span>พิมพ์สรุป ปพ.5 (A4)</span>
          </button>
        </div>
      </div>

      {/* Filters & View Switcher Bar */}
      <div className="saas-card saas-card-body flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาห้อง รหัสวิชา ชื่อวิชา..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-7 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={courseScope}
            onChange={(e) => {
              setCourseScope(e.target.value as 'all' | 'core' | 'elective');
              setCourseFilterId('all');
            }}
            aria-label="ประเภทวิชา"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
          >
            <option value="all">ทุกรายวิชา ({scopedCourses.length})</option>
            <option value="core">เฉพาะวิชาพื้นฐาน</option>
            <option value="elective">เฉพาะวิชาเพิ่มเติม</option>
          </select>

          <select
            value={courseFilterId}
            onChange={(e) => setCourseFilterId(e.target.value)}
            aria-label="เลือกรายวิชา"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)] max-w-[230px]"
          >
            <option value="all">ทุกรายวิชาในกลุ่ม ({scopedCourses.length})</option>
            {scopedCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.titleTh}
              </option>
            ))}
          </select>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            aria-label="เลือกห้องเรียน"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
          >
            <option value="all">ทุกห้องเรียน ({roomOptions.length})</option>
            {roomOptions.map((r) => (
              <option key={r} value={r}>
                ห้อง {r}
              </option>
            ))}
          </select>

          <select
            value={passThresholdPct}
            onChange={(e) => setPassThresholdPct(Number(e.target.value) as 50 | 60)}
            aria-label="เกณฑ์ผ่านตัวชี้วัด"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
          >
            <option value={50}>เกณฑ์ผ่านตัวชี้วัด ≥ 50% (สพฐ.)</option>
            <option value={60}>เกณฑ์ผ่านตัวชี้วัด ≥ 60%</option>
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[var(--color-card-subtle)] rounded-lg border border-[var(--color-border)] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('room_course_table')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'room_course_table'
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            สรุปรายห้อง × รายวิชา
          </button>
          <button
            type="button"
            onClick={() => setViewMode('room_overview')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'room_overview'
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            สรุปรวมระดับห้องเรียน
          </button>
          <button
            type="button"
            onClick={() => setViewMode('class_roster')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'class_roster'
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
            }`}
          >
            ตารางทั้งห้องรายบุคคล
          </button>
        </div>
      </div>

      {/* Printable Official Sheet */}
      <div ref={printSheetRef} className="space-y-4 print:bg-white print:text-slate-900">
        {/* Official Print Header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 text-center">
          <p className="text-xs font-bold">
            รายงานสรุปผลการประเมินคะแนนรายวิชา (ปพ.๕) รวมทั้งห้องเรียน · สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน
          </p>
          <h2 className="text-base font-extrabold">
            โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}
          </h2>
          <p className="text-xs">
            {formatSemesterLabel(semester)} ปีการศึกษา {academicYear} · เกณฑ์ผ่านตัวชี้วัด ≥ {passThresholdPct}%
          </p>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="saas-card saas-card-body space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>เกรดเฉลี่ยรวม (GPA รายห้องเฉลี่ย)</span>
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                {overallSummary.avgGpa.toFixed(2)}
              </span>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                ({overallSummary.avgScore.toFixed(1)}/100)
              </span>
            </div>
            <p className="text-[11px] font-mono tabular-nums text-[var(--color-text-muted)]">
              จาก GradeRecord {overallSummary.totalRecords} รายการ ({overallSummary.courseGroups} ห้อง-วิชา)
            </p>
          </div>

          <div className="saas-card saas-card-body space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>นักเรียนผ่านตัวชี้วัด</span>
              <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-sky-700 dark:text-sky-300">
                {overallSummary.indicatorPassedTotal} คน
              </span>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                ({overallSummary.indicatorPassPct}%)
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              ผ่านคะแนนตัวชี้วัดและเกณฑ์รวม ≥ {passThresholdPct}%
            </p>
          </div>

          <div className="saas-card saas-card-body space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>นักเรียนไม่ผ่านตัวชี้วัด (ซ่อมเสริม)</span>
              <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  overallSummary.indicatorFailedTotal > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {overallSummary.indicatorFailedTotal} คน
              </span>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                ({overallSummary.totalRecords > 0 ? 100 - overallSummary.indicatorPassPct : 0}%)
              </span>
            </div>
            <p className="text-[11px] font-mono tabular-nums text-[var(--color-text-muted)]">
              ติด 0 / ร / มส. รวม {overallSummary.specialOrZeroCount} รายการ
            </p>
          </div>

          <div className="saas-card saas-card-body space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>ขอบเขตห้องเรียนที่สรุป</span>
              <GraduationCap className="w-4 h-4 text-[var(--color-primary-text)]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono tabular-nums text-[var(--color-text-title)]">
                {roomAggregateRows.length} ห้อง
              </span>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                ดีขึ้นไป {overallSummary.goodPct}%
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              ประมวลผลจาก GradeRecord &amp; ตัวชี้วัดรายวิชา
            </p>
          </div>
        </div>

        {/* Room Comparison Bar Chart */}
        {chartData.length > 0 && viewMode !== 'class_roster' && (
          <div className="saas-card saas-card-body space-y-2.5 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  เปรียบเทียบคะแนนเฉลี่ย (%) และอัตราผ่านตัวชี้วัด (%) รายห้องเรียน
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  เกณฑ์ผ่านตัวชี้วัดที่เลือก: ≥ {passThresholdPct}% · อ้างอิงคะแนนเก็บระหว่างภาคและตัวชี้วัดรายวิชา
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                {chartData.length} ห้องเรียน
              </span>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, String(name ?? '')]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine
                    y={passThresholdPct}
                    stroke="#0284c7"
                    strokeDasharray="4 4"
                    label={{ value: `เกณฑ์ ${passThresholdPct}%`, position: 'insideTopRight', fill: '#0284c7', fontSize: 10 }}
                  />
                  <Bar dataKey="avgScore" name="คะแนนรวมเฉลี่ย (%)" fill="#2563eb" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="indicatorPassPct" name="ผ่านตัวชี้วัด (%)" fill="#059669" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TABLE VIEW 1: Room × Course Summary Table with Indicator Pass/Fail + Room GPA */}
        {viewMode === 'room_course_table' && (
          <div className="saas-card overflow-hidden print:border-slate-700">
            <div className="saas-card-header flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="type-section-title">
                  ตารางสรุปผลรวม ปพ.5 จำแนกห้องเรียน × รายวิชา (เกรดเฉลี่ยรายห้อง &amp; ผ่าน/ไม่ผ่านตัวชี้วัด)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  คำนวณอัตโนมัติจาก GradeRecord · คลิก "ดูทั้งห้อง" เพื่อตรวจรายชื่อนักเรียนรายบุคคลในห้องนั้น
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                {filteredRows.length} รายการ
              </span>
            </div>

            {filteredRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                ไม่พบข้อมูลคะแนน GradeRecord ในเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-comfortable w-full text-[11px] text-left">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                    <tr>
                      <th className="py-2 px-2.5 sticky left-0 z-10 bg-[var(--color-card-subtle)] print:static">ห้อง</th>
                      <th className="py-2 px-2.5">รหัสวิชา · รายวิชา</th>
                      <th className="py-2 px-2 text-right">คน</th>
                      <th className="py-2 px-2 text-right">ระหว่างเรียน</th>
                      <th className="py-2 px-2 text-right">ปลายภาค</th>
                      <th className="py-2 px-2 text-right">รวมเฉลี่ย</th>
                      <th className="py-2 px-2 text-right">GPA รายห้อง</th>
                      <th className="py-2 px-2 text-right text-emerald-700 dark:text-emerald-300">ผ่านตัวชี้วัด</th>
                      <th className="py-2 px-2 text-right text-rose-700 dark:text-rose-300">ไม่ผ่านตัวชี้วัด</th>
                      <th className="py-2 px-1.5 text-center">4</th>
                      <th className="py-2 px-1.5 text-center">3.5</th>
                      <th className="py-2 px-1.5 text-center">3</th>
                      <th className="py-2 px-1.5 text-center">2.5</th>
                      <th className="py-2 px-1.5 text-center">2</th>
                      <th className="py-2 px-1.5 text-center">1.5</th>
                      <th className="py-2 px-1.5 text-center">1</th>
                      <th className="py-2 px-1.5 text-center">0</th>
                      <th className="py-2 px-1.5 text-center">ร/มส.</th>
                      <th className="py-2 px-2 text-right print:hidden">ดูรายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] font-mono tabular-nums">
                    <PaginatedTableRows
                      items={filteredRows}
                      colSpan={19}
                      pageSize={15}
                      keepAllInDomForPrint
                      renderRow={(row, _idx, hiddenClass) => (
                      <tr key={row.key} className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)]`}>
                        <td className="py-2 px-2.5 font-sans font-bold text-[var(--color-text-title)] whitespace-nowrap sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] print:static">
                          {row.room}
                        </td>
                        <td className="py-2 px-2.5 font-sans">
                          <div className="font-semibold text-[var(--color-text-title)]">
                            <span className="font-mono text-[var(--color-primary-text)] mr-1">{row.course.code}</span>
                            {row.course.titleTh}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-muted)]">{row.areaShortTh}</div>
                        </td>
                        <td className="py-2 px-2 text-right">{row.studentCount}</td>
                        <td className="py-2 px-2 text-right">{row.avgFormative.toFixed(1)}</td>
                        <td className="py-2 px-2 text-right">{row.avgFinal.toFixed(1)}</td>
                        <td className="py-2 px-2 text-right font-bold text-[var(--color-text-title)]">
                          {row.avgTotalScore.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-700 dark:text-emerald-300">
                          {row.avgGpa.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-700 dark:text-emerald-300">
                          {row.indicatorPassedCount} ({row.indicatorPassPct}%)
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-bold ${
                            row.indicatorFailedCount > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {row.indicatorFailedCount} ({100 - row.indicatorPassPct}%)
                        </td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g4}</td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g35}</td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g3}</td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g25}</td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g2}</td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g15}</td>
                        <td className="py-2 px-1.5 text-center">{row.dist.g1}</td>
                        <td className={`py-2 px-1.5 text-center ${row.dist.g0 > 0 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}`}>
                          {row.dist.g0}
                        </td>
                        <td className={`py-2 px-1.5 text-center ${row.dist.special > 0 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}`}>
                          {row.dist.special}
                        </td>
                        <td className="py-2 px-2 text-right print:hidden">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRosterKey(row.key);
                                setViewMode('class_roster');
                              }}
                              className="px-2 py-1 rounded border border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-sans font-semibold cursor-pointer whitespace-nowrap"
                            >
                              ดูทั้งห้อง
                            </button>
                            {onOpenCoursePp5 && (
                              <button
                                type="button"
                                onClick={() => onOpenCoursePp5(row.course.id)}
                                className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] text-[11px] font-sans font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ปพ.5
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )} />
                  </tbody>
                  <tfoot className="bg-[var(--color-card-subtle)] border-t-2 border-[var(--color-border)] font-bold text-xs font-mono tabular-nums">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-2.5 font-sans text-[var(--color-text-title)]">
                        สรุปรวมทั้งหมด ({filteredRows.length} กลุ่มห้อง-วิชา)
                      </td>
                      <td className="py-2.5 px-2 text-right">{overallSummary.totalRecords}</td>
                      <td className="py-2.5 px-2 text-right text-[var(--color-text-muted)]">—</td>
                      <td className="py-2.5 px-2 text-right text-[var(--color-text-muted)]">—</td>
                      <td className="py-2.5 px-2 text-right">{overallSummary.avgScore.toFixed(1)}</td>
                      <td className="py-2.5 px-2 text-right text-emerald-700 dark:text-emerald-300">
                        {overallSummary.avgGpa.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-emerald-700 dark:text-emerald-300">
                        {overallSummary.indicatorPassedTotal} ({overallSummary.indicatorPassPct}%)
                      </td>
                      <td className="py-2.5 px-2 text-right text-rose-600 dark:text-rose-400">
                        {overallSummary.indicatorFailedTotal} ({overallSummary.totalRecords > 0 ? 100 - overallSummary.indicatorPassPct : 0}%)
                      </td>
                      <td colSpan={9} className="py-2.5 px-2 text-right font-sans font-semibold text-[var(--color-text-muted)]">
                        อัตราผ่านเกณฑ์ผลการเรียน {overallSummary.passPct}% · ระดับดีขึ้นไป {overallSummary.goodPct}%
                      </td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TABLE VIEW 2: Whole-Room Aggregate Summary */}
        {viewMode === 'room_overview' && (
          <div className="saas-card overflow-hidden print:border-slate-700">
            <div className="saas-card-header flex flex-wrap items-center justify-between gap-2">
              <h3 className="type-section-title">
                ตารางสรุปผลรวมระดับห้องเรียน (GPA เฉลี่ยห้อง &amp; จำนวนผ่าน/ไม่ผ่านตัวชี้วัดรวมทุกวิชา)
              </h3>
              <span className="text-xs font-mono tabular-nums text-[var(--color-text-muted)]">
                {roomAggregateRows.length} ห้องเรียน
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="table-comfortable w-full text-xs text-left">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                  <tr>
                    <th className="py-2.5 px-3 sticky left-0 z-10 bg-[var(--color-card-subtle)] whitespace-nowrap print:static">ห้องเรียน</th>
                    <th className="py-2.5 px-3">ระดับชั้น</th>
                    <th className="py-2.5 px-3 text-right">จำนวนวิชา</th>
                    <th className="py-2.5 px-3 text-right">รายการ GradeRecord</th>
                    <th className="py-2.5 px-3 text-right">คะแนนเฉลี่ยรวม</th>
                    <th className="py-2.5 px-3 text-right">GPA เฉลี่ยห้อง</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300">ผ่านตัวชี้วัด (คน / %)</th>
                    <th className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-300">ไม่ผ่านตัวชี้วัด (คน / %)</th>
                    <th className="py-2.5 px-3 text-right">ระดับดี (3–4)</th>
                    <th className="py-2.5 px-3 text-right">0 / ร / มส.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-mono tabular-nums">
                  <PaginatedTableRows
                    items={roomAggregateRows}
                    colSpan={10}
                    pageSize={15}
                    keepAllInDomForPrint
                    renderRow={(r, _idx, hiddenClass) => (
                    <tr key={r.room} className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)]`}>
                      <td className="py-2.5 px-3 font-sans font-bold text-[var(--color-text-title)] sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] whitespace-nowrap print:static">{r.room}</td>
                      <td className="py-2.5 px-3 font-sans text-[var(--color-text-body)]">{r.gradeLevel || '—'}</td>
                      <td className="py-2.5 px-3 text-right">{r.courseCount}</td>
                      <td className="py-2.5 px-3 text-right">{r.recordCount}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{r.avgTotalScore.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300">
                        {r.avgGpa.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300">
                        {r.indicatorPassedCount} ({r.indicatorPassPct}%)
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          r.indicatorFailedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        {r.indicatorFailedCount} ({100 - r.indicatorPassPct}%)
                      </td>
                      <td className="py-2.5 px-3 text-right">{r.goodOrAbovePct}%</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          r.specialCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {r.specialCount}
                      </td>
                    </tr>
                  )} />
                </tbody>
                <tfoot className="bg-[var(--color-card-subtle)] border-t-2 border-[var(--color-border)] font-bold font-mono tabular-nums">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 font-sans text-[var(--color-text-title)]">
                      สรุปรวมทุกห้องเรียน ({roomAggregateRows.length} ห้อง)
                    </td>
                    <td className="py-2.5 px-3 text-right">{overallSummary.totalRecords}</td>
                    <td className="py-2.5 px-3 text-right">{overallSummary.avgScore.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300">
                      {overallSummary.avgGpa.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300">
                      {overallSummary.indicatorPassedTotal} ({overallSummary.indicatorPassPct}%)
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                      {overallSummary.indicatorFailedTotal} ({overallSummary.totalRecords > 0 ? 100 - overallSummary.indicatorPassPct : 0}%)
                    </td>
                    <td className="py-2.5 px-3 text-right">{overallSummary.goodPct}%</td>
                    <td className="py-2.5 px-3 text-right">{overallSummary.specialOrZeroCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TABLE VIEW 3: Whole-Classroom Individual Roster Evaluation Table (ปพ.5) */}
        {viewMode === 'class_roster' && (
          <div className="saas-card overflow-hidden print:border-slate-700">
            <div className="saas-card-header flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <div>
                  <h3 className="type-section-title">
                    ตารางสรุปผลการประเมินคะแนนทั้งห้องเรียน (รายบุคคลจาก GradeRecord)
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    เลือกห้อง-รายวิชา เพื่อตรวจสอบคะแนน เกรดเฉลี่ยรายห้อง และผลผ่าน/ไม่ผ่านตัวชี้วัดทั้งห้อง
                  </p>
                </div>
              </div>

              {filteredRows.length > 0 && (
                <select
                  value={activeRosterGroup?.key || ''}
                  onChange={(e) => setSelectedRosterKey(e.target.value)}
                  aria-label="เลือกห้องและรายวิชาที่ต้องการดูรายบุคคลทั้งห้อง"
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)] print:hidden max-w-xs"
                >
                  {filteredRows.map((g) => (
                    <option key={g.key} value={g.key}>
                      ห้อง {g.room} · {g.course.code} {g.course.titleTh} ({g.studentCount} คน)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!activeRosterGroup ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                ไม่พบข้อมูลคะแนนในห้องเรียนที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="px-4 py-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-bold text-[var(--color-text-title)]">
                    ห้อง {activeRosterGroup.room} · {activeRosterGroup.course.code} {activeRosterGroup.course.titleTh}
                    <span className="font-normal text-[var(--color-text-muted)] ml-2">
                      ({activeRosterGroup.areaNameTh})
                    </span>
                  </div>
                  <div className="font-mono tabular-nums flex flex-wrap items-center gap-3">
                    <span>นักเรียน: <strong>{activeRosterGroup.studentCount}</strong> คน</span>
                    <span>GPA เฉลี่ยห้อง: <strong className="text-emerald-700 dark:text-emerald-300">{activeRosterGroup.avgGpa.toFixed(2)}</strong></span>
                    <span>ผ่านตัวชี้วัด: <strong className="text-emerald-700 dark:text-emerald-300">{activeRosterGroup.indicatorPassedCount}</strong></span>
                    <span>ไม่ผ่านตัวชี้วัด: <strong className="text-rose-600 dark:text-rose-400">{activeRosterGroup.indicatorFailedCount}</strong></span>
                  </div>
                </div>

                <table className="table-comfortable w-full text-xs text-left">
                  <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center sticky left-0 z-10 bg-[var(--color-card-subtle)] print:static">ที่</th>
                      <th className="py-2 px-2.5 sticky left-10 z-10 bg-[var(--color-card-subtle)] whitespace-nowrap print:static">รหัสนักเรียน</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">ชื่อ-นามสกุล</th>
                      <th className="py-2 px-2 text-right">กลางภาค (30)</th>
                      <th className="py-2 px-2 text-right">งาน (20)</th>
                      <th className="py-2 px-2 text-right">ทดสอบ (10)</th>
                      <th className="py-2 px-2 text-right">รวมระหว่างภาค (60)</th>
                      <th className="py-2 px-2 text-right">ปลายภาค (40)</th>
                      <th className="py-2 px-2 text-right">รวม (100)</th>
                      <th className="py-2 px-2 text-center">เกรด</th>
                      <th className="py-2 px-2.5">ประเมินตัวชี้วัด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] font-mono tabular-nums">
                    <PaginatedTableRows
                      items={activeRosterGroup.roster}
                      colSpan={11}
                      pageSize={20}
                      keepAllInDomForPrint
                      renderRow={(item, idx, hiddenClass) => (
                      <tr key={item.grade.id} className={`${hiddenClass} group hover:bg-[var(--color-card-subtle)]`}>
                        <td className="py-2 px-2.5 text-center text-[var(--color-text-muted)] sticky left-0 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] print:static">{idx + 1}</td>
                        <td className="py-2 px-2.5 text-[var(--color-primary-text)] font-semibold sticky left-10 z-10 bg-[var(--color-card)] group-hover:bg-[var(--color-card-subtle)] whitespace-nowrap print:static">
                          {item.student.studentIdNumber}
                        </td>
                        <td className="py-2 px-2.5 font-sans font-semibold text-[var(--color-text-title)] whitespace-nowrap">
                          {item.student.firstNameTh} {item.student.lastNameTh}
                        </td>
                        <td className="py-2 px-2 text-right">{item.grade.midtermScore}</td>
                        <td className="py-2 px-2 text-right">{item.grade.assignmentScore}</td>
                        <td className="py-2 px-2 text-right">{item.grade.quizScore}</td>
                        <td className="py-2 px-2 text-right font-semibold">{item.formativeScore}</td>
                        <td className="py-2 px-2 text-right">{item.finalScore}</td>
                        <td className="py-2 px-2 text-right font-bold text-[var(--color-text-title)]">
                          {item.totalScore}
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          <span
                            className={
                              item.isSpecial || item.point === 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-700 dark:text-emerald-300'
                            }
                          >
                            {item.letter}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-sans">
                          <StatusBadge
                            size="xs"
                            status={item.indicatorPassed ? 'complete' : 'delayed'}
                            label={item.indicatorPassed ? 'ผ่านตัวชี้วัด' : 'ไม่ผ่านตัวชี้วัด'}
                            title={item.indicatorReason}
                          />
                        </td>
                      </tr>
                    )} />
                  </tbody>
                  <tfoot className="bg-[var(--color-card-subtle)] border-t-2 border-[var(--color-border)] font-bold font-mono tabular-nums">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-2.5 font-sans text-[var(--color-text-title)]">
                        สรุปผลรวมทั้งห้อง {activeRosterGroup.room} ({activeRosterGroup.studentCount} คน)
                      </td>
                      <td colSpan={4} className="py-2.5 px-2 text-right">
                        เฉลี่ยระหว่างภาค {activeRosterGroup.avgFormative.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        เฉลี่ย {activeRosterGroup.avgFinal.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        เฉลี่ย {activeRosterGroup.avgTotalScore.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-300">
                        GPA {activeRosterGroup.avgGpa.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2.5 font-sans">
                        <span className="text-emerald-700 dark:text-emerald-300">
                          ผ่าน {activeRosterGroup.indicatorPassedCount}
                        </span>
                        <span className="mx-1 text-[var(--color-text-muted)]">·</span>
                        <span className="text-rose-600 dark:text-rose-400">
                          ไม่ผ่าน {activeRosterGroup.indicatorFailedCount}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Official Signature Footer (Print Only) */}
        <div className="hidden print:grid grid-cols-3 gap-4 border border-slate-700 rounded-lg p-4 text-xs text-center pt-6">
          <div className="space-y-8">
            <p className="font-bold">ครูประจำวิชา / นายทะเบียน</p>
            <p className="border-t border-dotted border-slate-500 pt-1">วันที่ ..... / .......... / ..........</p>
          </div>
          <div className="space-y-8">
            <p className="font-bold">หัวหน้างานวัดและประเมินผล</p>
            <p className="border-t border-dotted border-slate-500 pt-1">วันที่ ..... / .......... / ..........</p>
          </div>
          <div className="space-y-8">
            <p className="font-bold">ผู้อำนวยการสถานศึกษา</p>
            <p className="border-t border-dotted border-slate-500 pt-1">วันที่ ..... / .......... / ..........</p>
          </div>
        </div>
      </div>
    </div>
  );
};
