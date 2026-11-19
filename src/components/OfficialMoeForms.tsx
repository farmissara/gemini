import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AttendanceRecord,
  Course,
  GradeRecord,
  LearningIndicatorScore,
  LearningIndicatorSet,
  PeriodAttendanceRecord,
  School,
  Student,
  SystemConfig,
  TimetableSlot,
} from '../types';
import { formatSemesterLabel } from '../lib/schoolSettings';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  detectCourseEducationStage,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
  isActivityCourse,
  isPrimaryStage,
  resolveEffectiveGrade,
} from '../lib/moeGrading';
import {
  createObcUnitSetsForCourse,
  evaluateObecAttributeSummary,
  evaluateObecReadingSummary,
  MOE_ATTRIBUTES_DECISION_RULES,
  MOE_DESIRABLE_ATTRIBUTES_RUBRIC,
  MOE_KEY_COMPETENCIES,
  MOE_READING_DECISION_RULES,
  MOE_READING_WRITING_RUBRIC,
  MOE_STUDENT_ACTIVITIES,
  resolveMoeLearningArea,
} from '../data/moeCurriculumStandards';
import {
  loadLearningIndicatorScores,
  loadLearningIndicatorSets,
  saveLearningIndicatorSet,
} from '../lib/learningIndicatorStore';
import {
  calculateDetailedCourseAttendance,
  createDefaultStudentQualitative,
  getStudentQualitativeRecord,
  loadPp5CourseSettings,
  loadQualitativeAssessments,
  Pp5CourseSettings,
  savePp5CourseSettings,
  saveQualitativeAssessments,
  StudentQualitativeAssessment,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers,
  Printer,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

export type Pp5SectionId =
  | 'cover_summary'
  | 'attendance'
  | 'indicators_units'
  | 'attributes'
  | 'reading'
  | 'obec_audit'
  | 'all';

interface Pp5OfficialFormProps {
  selectedCourse: Course;
  students: Student[];
  courseGrades: GradeRecord[];
  systemConfig: SystemConfig;
  school?: School;
  timetableSlots: TimetableSlot[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  currentPp5Page: number;
  pp5PageSize: number;
  setPp5Page: (page: number) => void;
  searchQuery?: string;
  renderPageControls: (
    page: number,
    totalItems: number,
    pageSize: number,
    setPage: (page: number) => void,
    label: string,
    isLight?: boolean
  ) => React.ReactNode;
}

const getCategoryTypeLabel = (category: string) => {
  if (category === 'core') return 'รายวิชาพื้นฐาน';
  if (category === 'elective') return 'รายวิชาเพิ่มเติม';
  if (category === 'activities') return 'กิจกรรมพัฒนาผู้เรียน';
  return `รายวิชาเพิ่มเติม (${category})`;
};

const QUALITY_LABELS: Record<number, string> = {
  3: 'ดีเยี่ยม (๓)',
  2: 'ดี (๒)',
  1: 'ผ่าน (๑)',
  0: 'ไม่ผ่าน (๐)',
};

export const Pp5OfficialForm: React.FC<Pp5OfficialFormProps> = ({
  selectedCourse,
  students,
  courseGrades,
  systemConfig,
  school,
  timetableSlots,
  attendance,
  periodAttendance,
  currentPp5Page,
  pp5PageSize,
  setPp5Page,
  searchQuery = '',
  renderPageControls,
}) => {
  const schoolId = school?.id || selectedCourse.schoolId || 'default';
  const academicYear = selectedCourse.academicYear || systemConfig.academicYear || '2569';
  const semester = selectedCourse.semester || systemConfig.currentSemester || '1';
  const learningArea = useMemo(() => resolveMoeLearningArea(selectedCourse), [selectedCourse]);

  const [activeSection, setActiveSection] = useState<Pp5SectionId>('cover_summary');
  const [courseCfg, setCourseCfg] = useState<Pp5CourseSettings>(() =>
    loadPp5CourseSettings(selectedCourse.id, academicYear)
  );
  const [qualitativeMap, setQualitativeMap] = useState<Record<string, StudentQualitativeAssessment>>(() =>
    loadQualitativeAssessments(schoolId, academicYear, semester)
  );
  const [indicatorSets, setIndicatorSets] = useState<LearningIndicatorSet[]>([]);
  const [indicatorScoresMap, setIndicatorScoresMap] = useState<Record<string, LearningIndicatorScore[]>>({});
  const [seedingIndicators, setSeedingIndicators] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCourseCfg(loadPp5CourseSettings(selectedCourse.id, academicYear));
  }, [selectedCourse.id, academicYear]);

  useEffect(() => {
    setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
  }, [schoolId, academicYear, semester]);

  useEffect(() => {
    let mounted = true;
    void loadLearningIndicatorSets({
      schoolId,
      courseId: selectedCourse.id,
      academicYear,
      semester,
    }).then(async (loaded) => {
      if (!mounted) return;
      setIndicatorSets(loaded);
      const entries = await Promise.all(
        loaded.map(async (s) => [s.id, await loadLearningIndicatorScores({ schoolId, setId: s.id })] as const)
      );
      if (mounted) {
        const next: Record<string, LearningIndicatorScore[]> = {};
        entries.forEach(([id, list]) => {
          next[id] = list;
        });
        setIndicatorScoresMap(next);
      }
    });
    return () => {
      mounted = false;
    };
  }, [schoolId, selectedCourse.id, academicYear, semester]);

  const updateCourseCfg = (patch: Partial<Pp5CourseSettings>) => {
    setCourseCfg((prev) => {
      const next = { ...prev, ...patch };
      savePp5CourseSettings(selectedCourse.id, next);
      return next;
    });
  };

  const updateStudentQualitative = (
    studentId: string,
    updater: (prev: StudentQualitativeAssessment) => StudentQualitativeAssessment
  ) => {
    setQualitativeMap((prev) => {
      const current = getStudentQualitativeRecord(prev, studentId);
      const updated = { ...updater(current), updatedAt: new Date().toISOString() };
      const nextMap = { ...prev, [studentId]: updated };
      saveQualitativeAssessments(schoolId, academicYear, semester, nextMap);
      return nextMap;
    });
  };

  const handleBatchApplyAttributes = (level: 3 | 2 | 1 | 0) => {
    setQualitativeMap((prev) => {
      const nextMap = { ...prev };
      rosterStudents.forEach((stu) => {
        const current = getStudentQualitativeRecord(nextMap, stu.id);
        nextMap[stu.id] = {
          ...current,
          attributes: Array(8).fill(level),
          updatedAt: new Date().toISOString(),
        };
      });
      saveQualitativeAssessments(schoolId, academicYear, semester, nextMap);
      return nextMap;
    });
    setNoticeText(`กำหนดคุณลักษณะอันพึงประสงค์ ๘ ประการ เป็น "${QUALITY_LABELS[level]}" ครบทุกคนแล้ว`);
  };

  const handleBatchApplyReading = (level: 3 | 2 | 1 | 0) => {
    setQualitativeMap((prev) => {
      const nextMap = { ...prev };
      rosterStudents.forEach((stu) => {
        const current = getStudentQualitativeRecord(nextMap, stu.id);
        nextMap[stu.id] = {
          ...current,
          readingWriting: Array(5).fill(level),
          updatedAt: new Date().toISOString(),
        };
      });
      saveQualitativeAssessments(schoolId, academicYear, semester, nextMap);
      return nextMap;
    });
    setNoticeText(`กำหนดผลการอ่าน คิดวิเคราะห์ และเขียน ๕ ด้าน เป็น "${QUALITY_LABELS[level]}" ครบทุกคนแล้ว`);
  };

  const handleSeedObecUnits1To3 = async () => {
    setSeedingIndicators(true);
    try {
      const generated = createObcUnitSetsForCourse({
        schoolId,
        course: selectedCourse,
        academicYear,
        semester,
      });
      for (const s of generated) {
        await saveLearningIndicatorSet(s);
      }
      setIndicatorSets((prev) => {
        const existing = new Set(prev.map((x) => x.id));
        return [...prev, ...generated.filter((x) => !existing.has(x.id))];
      });
      setNoticeText(`นำเข้ามาตรฐานตัวชี้วัด หน่วยที่ 1–3 (${learningArea.shortTh}) เข้าสู่ ปพ.๕ เรียบร้อยแล้ว`);
    } finally {
      setSeedingIndicators(false);
    }
  };

  const totalHours = selectedCourse.totalHours || Math.max(20, Math.round(selectedCourse.credits * 40));
  const minAttendanceHours = selectedCourse.minAttendanceHours || Math.round(totalHours * 0.8);

  const rosterStudents = useMemo(() => {
    const enrolledIds = new Set(selectedCourse.enrolledStudentIds || []);
    const gradedIds = new Set(courseGrades.map((g) => g.studentId));
    const combinedIds = new Set([...enrolledIds, ...gradedIds]);
    return students.filter((s) => combinedIds.has(s.id));
  }, [students, selectedCourse.enrolledStudentIds, courseGrades]);

  const courseStage = useMemo(
    () => detectCourseEducationStage(selectedCourse, rosterStudents),
    [selectedCourse, rosterStudents]
  );
  const isPrimaryCourse = isPrimaryStage(courseStage);
  const courseIsActivity = isActivityCourse(selectedCourse);

  const distinctRooms = useMemo(() => {
    const rooms = Array.from(new Set(rosterStudents.map((s) => s.room).filter(Boolean)));
    return rooms.length > 0 ? rooms.join(', ') : selectedCourse.room || '-';
  }, [rosterStudents, selectedCourse.room]);

  const rows = useMemo(() => {
    return rosterStudents.map((student, index) => {
      const grade = courseGrades.find((g) => g.studentId === student.id);
      const attendanceDetail = calculateDetailedCourseAttendance({
        student,
        course: selectedCourse,
        timetableSlots,
        attendance,
        periodAttendance,
      });
      const isMs = attendanceDetail.isAtRiskMs;
      const resolved = resolveEffectiveGrade(grade, selectedCourse, systemConfig.gradingSystem, isMs);
      const qualRecord = getStudentQualitativeRecord(qualitativeMap, student.id);
      const qualSummary = summarizeStudentQualitative(qualRecord);
      const courseworkSubtotal = grade
        ? grade.assignmentScore + grade.quizScore + grade.midtermScore
        : null;

      // Unit indicator breakdown
      const unitResults = indicatorSets.map((set) => {
        const maxScore = set.indicators.reduce((sum, ind) => sum + ind.maxScore, 0);
        const setScores = indicatorScoresMap[set.id] || [];
        let earned = 0;
        let passedCount = 0;
        let hasRecorded = false;
        set.indicators.forEach((ind) => {
          const found = setScores.find((sc) => sc.studentId === student.id && sc.indicatorId === ind.id);
          if (found) {
            hasRecorded = true;
            earned += found.score;
            if (found.score >= ind.maxScore * 0.5) passedCount += 1;
          }
        });
        const pct = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;
        return {
          setId: set.id,
          earned,
          maxScore,
          pct,
          passedCount,
          totalCount: set.indicators.length,
          hasRecorded,
        };
      });

      const totalUnitEarned = unitResults.reduce((s, u) => s + u.earned, 0);
      const totalUnitMax = unitResults.reduce((s, u) => s + u.maxScore, 0);
      const hasAnyUnitScore = unitResults.some((u) => u.hasRecorded);

      return {
        index,
        student,
        grade,
        attendanceDetail,
        isMs: isMs || resolved.letter === 'มส.',
        resolved,
        finalLetter: resolved.letter,
        qualRecord,
        qualSummary,
        attrNum: qualSummary.attrLevel,
        readingNum: qualSummary.readingLevel,
        competencyNum: qualSummary.compLevel,
        courseworkSubtotal,
        unitResults,
        totalUnitEarned,
        totalUnitMax,
        hasAnyUnitScore,
      };
    });
  }, [
    rosterStudents,
    courseGrades,
    selectedCourse,
    timetableSlots,
    attendance,
    periodAttendance,
    systemConfig.gradingSystem,
    qualitativeMap,
    indicatorSets,
    indicatorScoresMap,
  ]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ student }) =>
      [
        student.studentIdNumber,
        student.nationalId,
        `${student.firstNameTh} ${student.lastNameTh}`,
        `${student.firstNameEn} ${student.lastNameEn}`,
        student.room,
        student.gradeLevel,
      ].some((val) => (val || '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const stats = useMemo(() => {
    const total = rows.length;
    const isThai = systemConfig.gradingSystem === 'thai';
    const gradeKeys = courseIsActivity
      ? ['ผ', 'มผ', 'ร', 'มส.']
      : isThai
      ? ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส.']
      : ['A', 'B', 'C', 'D', 'F', 'ร', 'มส.'];

    const counts: Record<string, number> = {};
    gradeKeys.forEach((k) => {
      counts[k] = 0;
    });

    const scores: number[] = [];
    let passedCount = 0;
    let level3OrAboveCount = 0;
    const attrCounts: Record<'3' | '2' | '1' | '0', number> = { '3': 0, '2': 0, '1': 0, '0': 0 };
    const readingCounts: Record<'3' | '2' | '1' | '0', number> = { '3': 0, '2': 0, '1': 0, '0': 0 };
    const competencyCounts: Record<'3' | '2' | '1' | '0', number> = { '3': 0, '2': 0, '1': 0, '0': 0 };

    let totalAttPercent = 0;
    let msRiskCount = 0;
    let realLogStudents = 0;

    rows.forEach((row) => {
      if (row.finalLetter in counts) {
        counts[row.finalLetter] += 1;
      } else if (row.finalLetter === 'มส.') {
        counts['มส.'] = (counts['มส.'] || 0) + 1;
      } else if ('ร' in counts) {
        counts['ร'] += 1;
      }

      if (row.grade && !row.resolved.isSpecial) {
        scores.push(row.grade.totalScore);
        if (row.resolved.point >= 1) passedCount += 1;
        if (row.resolved.point >= 3) level3OrAboveCount += 1;
      } else if (courseIsActivity && row.finalLetter === 'ผ') {
        if (row.grade) scores.push(row.grade.totalScore);
        passedCount += 1;
      } else if (row.grade && row.finalLetter === 'มผ') {
        scores.push(row.grade.totalScore);
      }

      attrCounts[String(row.attrNum) as '3' | '2' | '1' | '0'] += 1;
      readingCounts[String(row.readingNum) as '3' | '2' | '1' | '0'] += 1;
      competencyCounts[String(row.competencyNum) as '3' | '2' | '1' | '0'] += 1;

      totalAttPercent += row.attendanceDetail.attendancePercent;
      if (row.attendanceDetail.isAtRiskMs) msRiskCount += 1;
      if (row.attendanceDetail.source !== 'baseline_timetable') realLogStudents += 1;
    });

    const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');
    const meanNum = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
    const mean = meanNum !== null ? meanNum.toFixed(1) : '-';
    const sd =
      meanNum !== null && scores.length > 1
        ? Math.sqrt(scores.reduce((s, v) => s + (v - meanNum) ** 2, 0) / scores.length).toFixed(1)
        : '-';
    const max = scores.length > 0 ? Math.max(...scores) : '-';
    const min = scores.length > 0 ? Math.min(...scores) : '-';
    const avgAttendancePct = total > 0 ? (totalAttPercent / total).toFixed(1) : '0.0';

    return {
      total,
      gradeKeys,
      counts,
      passedCount,
      level3OrAboveCount,
      failedOrIncompleteCount: total - passedCount,
      attrCounts,
      readingCounts,
      competencyCounts,
      pct,
      mean,
      sd,
      max,
      min,
      avgAttendancePct,
      msRiskCount,
      realLogStudents,
    };
  }, [rows, systemConfig.gradingSystem, courseIsActivity]);

  const roomSummaryRows = useMemo(() => {
    const byRoom = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const room = (row.student.room || selectedCourse.room || 'ไม่ระบุห้อง').trim();
      const list = byRoom.get(room) || [];
      list.push(row);
      byRoom.set(room, list);
    });

    const result: Array<{
      room: string;
      studentCount: number;
      avgScore: number;
      avgGpa: number;
      indicatorPassed: number;
      indicatorFailed: number;
      indicatorPassPct: number;
    }> = [];

    byRoom.forEach((list, room) => {
      const n = list.length;
      let scoreSum = 0;
      let scoreCount = 0;
      let gpaSum = 0;
      let gpaCount = 0;
      let indicatorPassed = 0;
      let indicatorFailed = 0;

      list.forEach((r) => {
        if (r.grade) {
          scoreSum += r.grade.totalScore;
          scoreCount += 1;
        }
        if (!r.resolved.isSpecial && r.resolved.countsInGpa) {
          gpaSum += r.resolved.point;
          gpaCount += 1;
        }
        const unitFailed = r.hasAnyUnitScore
          ? r.unitResults.some((u) => u.hasRecorded && u.pct < 50)
          : false;
        const formativePct =
          r.courseworkSubtotal !== null ? Math.round((r.courseworkSubtotal / 60) * 100) : 0;
        const passed =
          Boolean(r.grade) &&
          !r.resolved.isSpecial &&
          !unitFailed &&
          (r.grade?.totalScore ?? 0) >= 50 &&
          formativePct >= 50;
        if (passed) indicatorPassed += 1;
        else indicatorFailed += 1;
      });

      result.push({
        room,
        studentCount: n,
        avgScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0,
        avgGpa: gpaCount > 0 ? Math.round((gpaSum / gpaCount) * 100) / 100 : 0,
        indicatorPassed,
        indicatorFailed,
        indicatorPassPct: n > 0 ? Math.round((indicatorPassed / n) * 100) : 0,
      });
    });

    return result.sort((a, b) => a.room.localeCompare(b.room, 'th'));
  }, [rows, selectedCourse.room]);

  const obecComplianceRows = useMemo(() => {
    const hasIndicators = indicatorSets.length > 0;
    const has3Units = indicatorSets.length >= 3;
    const hasScoredIndicators = Object.values(indicatorScoresMap).some((list) => list.length > 0);
    const hasRealAttendance = stats.realLogStudents > 0;
    const hasGrades = courseGrades.length > 0;
    const hasQualRecords = Object.keys(qualitativeMap).length > 0;

    return [
      {
        no: 1,
        topic: 'สมุดบันทึกพัฒนาคุณภาพผู้เรียน (ปพ.๕)',
        obecRule: 'มีหน้าปก/ข้อมูลรายวิชา สรุปผลสัมฤทธิ์ บัญชีคะแนน และคณะกรรมการอนุมัติ ๔ ระดับ',
        statusText: `ครบทั้ง ๔ ส่วน (อัตราส่วน ${courseCfg.scoreRatioMid}:${courseCfg.scoreRatioFinal})`,
        ready: true,
        targetSection: 'cover_summary' as Pp5SectionId,
      },
      {
        no: 2,
        topic: 'ตัวชี้วัดและมาตรฐานตัวชี้วัด หน่วยที่ ๑–๓',
        obecRule: 'จำแนกตัวชี้วัดระหว่างทาง-ปลายทาง เชื่อมโยงมาตรฐาน ๘ กลุ่มสาระฯ',
        statusText: has3Units
          ? `ครบ ${indicatorSets.length} หน่วย (${indicatorSets.reduce((s, x) => s + x.indicators.length, 0)} ตัวชี้วัด)`
          : hasIndicators
          ? `มี ${indicatorSets.length} หน่วย (แนะนำเพิ่มให้ครบ ๓ หน่วย)`
          : 'ยังไม่ได้กำหนดชุดตัวชี้วัดรายวิชา',
        ready: has3Units,
        targetSection: 'indicators_units' as Pp5SectionId,
      },
      {
        no: 3,
        topic: 'สถิติการมาเรียน (เกณฑ์เวลาเรียน ๘๐%)',
        obecRule: 'บันทึกเวลาเรียนจริง มา/สาย/ลาป่วย/ลากิจ/ขาด ตัดสินสิทธิ์สอบ มส. (< ๘๐%)',
        statusText: hasRealAttendance
          ? `เชื่อมข้อมูลเช็คชื่อจริง ${stats.realLogStudents}/${stats.total} คน · เฉลี่ย ${stats.avgAttendancePct}%`
          : `ใช้ค่ามาตรฐานตารางสอน (${stats.avgAttendancePct}%) — รอบันทึกเช็คชื่อรายคาบ/วัน`,
        ready: hasRealAttendance,
        targetSection: 'attendance' as Pp5SectionId,
      },
      {
        no: 4,
        topic: 'คะแนนตามตัวชี้วัด กลุ่มสาระการเรียนรู้',
        obecRule: `บันทึกคะแนนรายตัวชี้วัดภายใต้ ${learningArea.nameTh}`,
        statusText: hasScoredIndicators
          ? 'บันทึกคะแนนตามตัวชี้วัดรายบุคคลแล้ว'
          : 'รอครูกรอกคะแนนรายตัวชี้วัดในหน่วยการเรียนรู้',
        ready: hasScoredIndicators,
        targetSection: 'indicators_units' as Pp5SectionId,
      },
      {
        no: 5,
        topic: 'การประเมินหน่วยการเรียนรู้ (รายวิชาพื้นฐาน/เพิ่มเติม)',
        obecRule: 'สรุปคะแนนและผลการผ่านตัวชี้วัดแยกตามหน่วยการเรียนรู้ที่ ๑–๓',
        statusText: hasIndicators ? `พร้อมรายงานประเมิน ${indicatorSets.length} หน่วย` : 'รอตั้งค่าหน่วยการเรียนรู้',
        ready: hasIndicators,
        targetSection: 'indicators_units' as Pp5SectionId,
      },
      {
        no: 6,
        topic: 'การประเมินคุณลักษณะอันพึงประสงค์ ๘ ประการ & เกณฑ์ สพฐ.',
        obecRule: 'ประเมินครบทั้ง ๘ ข้อ (๐–๓) และตัดสินผลตามเกณฑ์ สพฐ. พร้อมตาราง Rubric',
        statusText: hasQualRecords
          ? `บันทึกประเมินครบ ๘ ด้าน (ดีเยี่ยม ${stats.attrCounts['3']} คน)`
          : 'ใช้ค่าเริ่มต้นดีเยี่ยม (๓) — สามารถปรับรายข้อได้ทั้ง ๘ ประการ',
        ready: true,
        targetSection: 'attributes' as Pp5SectionId,
      },
      {
        no: 7,
        topic: 'การประเมินการอ่าน คิดวิเคราะห์ และเขียน ๕ ด้าน & เกณฑ์ สพฐ.',
        obecRule: 'ประเมินครบ ๕ ด้าน (อ่านหาสารสนเทศ, จับประเด็น, วิเคราะห์, วิจารณ์, เขียนสื่อความหมาย)',
        statusText: `ประเมิน ๕ ด้านครบ (ดีเยี่ยม ${stats.readingCounts['3']} คน · ผ่านเกณฑ์ ${stats.total - stats.readingCounts['0']} คน)`,
        ready: true,
        targetSection: 'reading' as Pp5SectionId,
      },
      {
        no: 8,
        topic: 'รอบการประเมิน ป.๑–ป.๖ (รายปี) vs ม.๑–ม.๖ (รายภาค)',
        obecRule: 'ประถมศึกษาประเมินรายปีเน้นคะแนนดิบ/ร้อยละ; มัธยมประเมินรายภาค ๐–๔ และ GPAX',
        statusText: isPrimaryCourse
          ? 'โหมดประถมศึกษา (ประเมินรายปี • แสดงคะแนนดิบและร้อยละ)'
          : `โหมดมัธยมศึกษา (${formatSemesterLabel(semester)} • ระบบเกรด ๐–๔ / A–F)`,
        ready: true,
        targetSection: 'cover_summary' as Pp5SectionId,
      },
      {
        no: 9,
        topic: 'ผลการเรียน & อักษรพิเศษ (ร, มส., ผ, มผ)',
        obecRule: 'บันทึกคะแนนระหว่างภาค/ปลายภาค พร้อมจัดการ ร / มส. / ผ / มผ ตามระเบียบ ศธ.',
        statusText: hasGrades
          ? `บันทึกคะแนนแล้ว ${courseGrades.length} คน (ผ่าน ${stats.passedCount} / เสี่ยง มส. ${stats.msRiskCount})`
          : 'ยังไม่มีคะแนนบันทึกในวิชานี้',
        ready: hasGrades,
        targetSection: 'cover_summary' as Pp5SectionId,
      },
    ];
  }, [
    indicatorSets,
    indicatorScoresMap,
    stats,
    courseGrades.length,
    qualitativeMap,
    courseCfg.scoreRatioMid,
    courseCfg.scoreRatioFinal,
    learningArea.nameTh,
    isPrimaryCourse,
    semester,
  ]);

  const handlePrintPp5 = () => {
    if (!printSheetRef.current) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `ปพ5_สมุดบันทึกพัฒนาคุณภาพผู้เรียน_${selectedCourse.code}`
    );
  };

  const showCoverSummary = activeSection === 'cover_summary' || activeSection === 'all';
  const showAttendance = activeSection === 'attendance' || activeSection === 'all';
  const showIndicatorsUnits = activeSection === 'indicators_units' || activeSection === 'all';
  const showAttributes = activeSection === 'attributes' || activeSection === 'all';
  const showReading = activeSection === 'reading' || activeSection === 'all';
  const showObecAudit = activeSection === 'obec_audit' || activeSection === 'all';

  const sectionTabs: Array<{ id: Pp5SectionId; label: string }> = [
    { id: 'cover_summary', label: '๑. ปก & สรุปผลสัมฤทธิ์' },
    { id: 'attendance', label: '๒. สถิติการมาเรียน (80%)' },
    { id: 'indicators_units', label: '๓. ตัวชี้วัด & ประเมินหน่วย 1–3' },
    { id: 'attributes', label: '๔. คุณลักษณะฯ 8 ข้อ & เกณฑ์' },
    { id: 'reading', label: '๕. อ่าน คิดวิเคราะห์ฯ 5 ด้าน & เกณฑ์' },
    { id: 'obec_audit', label: '๖. เทียบเกณฑ์ สพฐ./ศธ.' },
    { id: 'all', label: 'ดูทั้งเล่ม ปพ.๕' },
  ];

  const ratioPresets: Array<{ mid: number; final: number; label: string }> = [
    { mid: 70, final: 30, label: '70 : 30 (มาตรฐาน สพฐ.)' },
    { mid: 80, final: 20, label: '80 : 20 (เน้นปฏิบัติ/พื้นฐาน)' },
    { mid: 60, final: 40, label: '60 : 40 (เน้นสอบปลายภาค)' },
  ];

  return (
    <div className="space-y-3">
      {/* Screen-only Section Switcher & Print Controls */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2.5 print:hidden space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--color-text-title)] truncate">
                สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.๕ ฉบับ สพฐ.) · {selectedCourse.code} {selectedCourse.titleTh}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                {learningArea.nameTh} · {getCategoryTypeLabel(selectedCourse.category)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintPp5}
            className="btn-action-primary px-3 py-1.5 text-xs shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์เอกสาร ปพ.๕ (A4)</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === tab.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {noticeText && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 print:hidden">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{noticeText}</span>
          </span>
          <button type="button" onClick={() => setNoticeText('')} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Screen-only Collapsible Official Metadata & Ratio Editor */}
      <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 print:hidden">
        <summary className="list-none flex flex-wrap items-center justify-between gap-2 cursor-pointer text-xs font-bold text-[var(--color-text-title)]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
            <span>ตั้งค่าหัวกระดาษ อัตราส่วนคะแนน สพฐ. และผู้ลงนาม ปพ.๕</span>
          </div>
          <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
            {courseCfg.affiliationOffice} · ชุดที่ {courseCfg.docSetNo} · อัตราส่วน {courseCfg.scoreRatioMid}:{courseCfg.scoreRatioFinal}
          </span>
        </summary>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs pt-2.5 mt-2 border-t border-[var(--color-border)]">
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              สังกัด / สำนักงานเขตพื้นที่ (สพป./สพม.)
            </label>
            <input
              type="text"
              value={courseCfg.affiliationOffice}
              onChange={(e) => updateCourseCfg({ affiliationOffice: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              ชุดที่ / ปีการศึกษา
            </label>
            <input
              type="text"
              value={courseCfg.docSetNo}
              onChange={(e) => updateCourseCfg({ docSetNo: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              อัตราส่วนคะแนน (ระหว่างเรียน : ปลายภาค)
            </label>
            <select
              value={`${courseCfg.scoreRatioMid}:${courseCfg.scoreRatioFinal}`}
              onChange={(e) => {
                const [mid, fin] = e.target.value.split(':').map(Number);
                updateCourseCfg({ scoreRatioMid: mid, scoreRatioFinal: fin });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            >
              {ratioPresets.map((p) => (
                <option key={p.label} value={`${p.mid}:${p.final}`}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              หัวหน้ากลุ่มสาระการเรียนรู้
            </label>
            <input
              type="text"
              value={courseCfg.headOfDeptName}
              onChange={(e) => updateCourseCfg({ headOfDeptName: e.target.value })}
              placeholder="เว้นว่างเพื่อพิมพ์เส้นประ..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              หัวหน้างานวัดและประเมินผล
            </label>
            <input
              type="text"
              value={courseCfg.measurementHeadName}
              onChange={(e) => updateCourseCfg({ measurementHeadName: e.target.value })}
              placeholder="เว้นว่างเพื่อพิมพ์เส้นประ..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--color-text-muted)] mb-1">
              ผู้อำนวยการสถานศึกษา
            </label>
            <input
              type="text"
              value={courseCfg.directorName}
              onChange={(e) => updateCourseCfg({ directorName: e.target.value })}
              placeholder="เว้นว่างเพื่อพิมพ์เส้นประ..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
            />
          </div>
        </div>
      </details>

      {/* =================================================================
          OFFICIAL WHITE A4-READY PAPER SHEET
          ================================================================= */}
      <div
        ref={printSheetRef}
        className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-300 space-y-8 print:m-0 print:p-0 print:border-none print:shadow-none"
      >
        {/* Official Government Document Header (Always Shown) */}
        <div className="border-b-2 border-slate-900 pb-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            {school?.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.nameTh}
                className="w-16 h-16 object-contain border border-slate-300 rounded-lg p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center text-center shrink-0">
                <GraduationCap className="w-7 h-7 text-slate-900" />
                <span className="text-[8px] font-bold tracking-wider">สพฐ.</span>
              </div>
            )}

            <div className="text-center flex-1 space-y-0.5">
              <p className="text-xs font-bold text-slate-700">
                สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.๕)
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-950">
                โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}
              </h2>
              <p className="text-xs font-medium text-slate-700">
                สังกัด {courseCfg.affiliationOffice}
                {school?.code ? ` · รหัสสถานศึกษา ${school.code}` : ''}
              </p>
              <p className="text-[11px] text-slate-600">
                ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง พุทธศักราช ๒๕๖๐)
              </p>
            </div>

            <div className="border-2 border-slate-900 px-3 py-1.5 text-center shrink-0">
              <div className="text-sm font-extrabold text-slate-950">ปพ.๕</div>
              <div className="text-[10px] font-mono text-slate-700">ชุดที่ {courseCfg.docSetNo}</div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-700">
            <tbody>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-36">รหัสวิชา / ชื่อรายวิชา</td>
                <td className="border border-slate-500 px-3 py-1.5 font-semibold" colSpan={3}>
                  <span className="font-mono font-bold">{selectedCourse.code}</span> — {selectedCourse.titleTh}
                  {selectedCourse.titleEn ? <span className="text-slate-600 ml-1.5">({selectedCourse.titleEn})</span> : null}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ประเภทวิชา</td>
                <td className="border border-slate-500 px-3 py-1.5">{getCategoryTypeLabel(selectedCourse.category)}</td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-40">กลุ่มสาระการเรียนรู้</td>
                <td className="border border-slate-500 px-3 py-1.5 font-medium">{learningArea.nameTh}</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">
                  {isPrimaryCourse ? 'รอบประเมิน / ปีการศึกษา' : 'ภาคเรียน / ปีการศึกษา'}
                </td>
                <td className="border border-slate-500 px-3 py-1.5">
                  {isPrimaryCourse
                    ? `ประเมินผลรายปี • ปีการศึกษา ${academicYear}`
                    : `${formatSemesterLabel(semester)} ปีการศึกษา ${academicYear}`}
                  <span className="ml-1.5 text-[10px] text-slate-600">
                    ({getEducationStageLabelTh(courseStage)})
                  </span>
                </td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ระดับชั้น / ห้องเรียน</td>
                <td className="border border-slate-500 px-3 py-1.5">{distinctRooms}</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">เวลาเรียน / น้ำหนัก</td>
                <td className="border border-slate-500 px-3 py-1.5 tabular-nums">
                  {courseIsActivity
                    ? `กิจกรรมพัฒนาผู้เรียน (ประเมิน ผ/มผ • ${totalHours} ชม.)`
                    : selectedCourse.credits === 0
                    ? `ไม่มีหน่วยกิต (${totalHours} ชม. • เกณฑ์ 80% = ${minAttendanceHours} ชม.)`
                    : isPrimaryCourse
                    ? `${selectedCourse.credits.toFixed(1)} น้ำหนักวิชา (${totalHours} ชม./ปี • อัตราส่วน ${courseCfg.scoreRatioMid}:${courseCfg.scoreRatioFinal})`
                    : `${selectedCourse.credits.toFixed(1)} หน่วยกิต (${totalHours} ชม./ภาค • อัตราส่วน ${courseCfg.scoreRatioMid}:${courseCfg.scoreRatioFinal})`}
                </td>
                <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ครูผู้สอน</td>
                <td className="border border-slate-500 px-3 py-1.5 font-semibold">{selectedCourse.teacherName || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===============================================================
            SECTION 1: สรุปผลสัมฤทธิ์ & บัญชีคะแนนรวม ปพ.๕
           =============================================================== */}
        {showCoverSummary && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
                <h3 className="text-xs font-extrabold text-slate-950">
                  ส่วนที่ ๑ แบบสรุปผลการพัฒนาคุณภาพผู้เรียนประจำรายวิชา (สพฐ.)
                </h3>
                <div className="text-[11px] font-mono tabular-nums text-slate-700">
                  เฉลี่ย (Mean): <strong>{stats.mean}</strong> | SD: <strong>{stats.sd}</strong> | สูงสุด: <strong>{stats.max}</strong> | ต่ำสุด: <strong>{stats.min}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 text-left w-28">
                        รายการสรุปผลสัมฤทธิ์
                      </th>
                      <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 w-14">
                        ทั้งหมด<br />(คน)
                      </th>
                      <th colSpan={stats.gradeKeys.length} className="border border-slate-600 px-2 py-1">
                        จำนวนผู้เรียนที่ได้ระดับผลการเรียน ({systemConfig.gradingSystem === 'thai' ? 'ระบบ 0–4' : 'ระบบ A–F'})
                      </th>
                      <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 bg-emerald-50">
                        ผ่านเกณฑ์<br />(ระดับ 1–4)
                      </th>
                      <th rowSpan={2} className="border border-slate-600 px-2 py-1.5 bg-blue-50">
                        ระดับดีขึ้นไป<br />(3–4)
                      </th>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      {stats.gradeKeys.map((key) => (
                        <th key={key} className="border border-slate-600 px-1.5 py-1 min-w-8 font-mono">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-600 px-2 py-1.5 text-left font-bold bg-slate-50">จำนวน (คน)</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold">{stats.total}</td>
                      {stats.gradeKeys.map((key) => (
                        <td key={key} className="border border-slate-600 px-1.5 py-1.5 font-mono">
                          {stats.counts[key]}
                        </td>
                      ))}
                      <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-emerald-50/70 text-emerald-900">
                        {stats.passedCount}
                      </td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-blue-50/70 text-blue-900">
                        {stats.level3OrAboveCount}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-600 px-2 py-1.5 text-left font-bold bg-slate-50">ร้อยละ (%)</td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono">100.0</td>
                      {stats.gradeKeys.map((key) => (
                        <td key={key} className="border border-slate-600 px-1.5 py-1.5 font-mono text-slate-600">
                          {stats.pct(stats.counts[key])}
                        </td>
                      ))}
                      <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-emerald-50/70 text-emerald-900">
                        {stats.pct(stats.passedCount)}%
                      </td>
                      <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold bg-blue-50/70 text-blue-900">
                        {stats.pct(stats.level3OrAboveCount)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 1.2 Desirable Attributes / Analytical Reading / Key Competencies Summary */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-600 px-2.5 py-1.5 text-left">
                        ๑.๒ สรุปผลการประเมินตามองค์ประกอบหลักสูตรแกนกลางฯ (เชื่อมข้อมูลจริงจากแบบประเมิน)
                      </th>
                      <th className="border border-slate-600 px-2 py-1.5">ดีเยี่ยม (๓)</th>
                      <th className="border border-slate-600 px-2 py-1.5">ดี (๒)</th>
                      <th className="border border-slate-600 px-2 py-1.5">ผ่าน (๑)</th>
                      <th className="border border-slate-600 px-2 py-1.5">ไม่ผ่าน (๐)</th>
                      <th className="border border-slate-600 px-2 py-1.5">ร้อยละระดับดีขึ้นไป</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'คุณลักษณะอันพึงประสงค์ ๘ ประการ', counts: stats.attrCounts },
                      { label: 'การอ่าน คิดวิเคราะห์ และเขียนสื่อความหมาย ๕ ด้าน', counts: stats.readingCounts },
                      { label: 'สมรรถนะสำคัญของผู้เรียน ๕ ประการ', counts: stats.competencyCounts },
                    ].map(({ label, counts }) => {
                      const goodOrAbove = counts['3'] + counts['2'];
                      return (
                        <tr key={label}>
                          <td className="border border-slate-600 px-2.5 py-1.5 text-left font-medium">{label}</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['3']} คน</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['2']} คน</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['1']} คน</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono">{counts['0']} คน</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold">
                            {stats.pct(goodOrAbove)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 1.3 Classroom Summary Table: Room GPA & Indicator Pass/Fail from GradeRecord */}
              {roomSummaryRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-900">
                        <th className="border border-slate-600 px-2.5 py-1.5 text-left">
                          ๑.๓ สรุปผลรวมทั้งห้องเรียน (คำนวณ GPA รายห้องและผ่าน/ไม่ผ่านตัวชี้วัดจาก GradeRecord)
                        </th>
                        <th className="border border-slate-600 px-2 py-1.5">จำนวนนักเรียน</th>
                        <th className="border border-slate-600 px-2 py-1.5">คะแนนเฉลี่ยรวม</th>
                        <th className="border border-slate-600 px-2 py-1.5">เกรดเฉลี่ยรายห้อง (GPA)</th>
                        <th className="border border-slate-600 px-2 py-1.5 bg-emerald-50">ผ่านตัวชี้วัด (คน / %)</th>
                        <th className="border border-slate-600 px-2 py-1.5 bg-rose-50">ไม่ผ่านตัวชี้วัด (คน / %)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomSummaryRows.map((rm) => (
                        <tr key={rm.room}>
                          <td className="border border-slate-600 px-2.5 py-1.5 text-left font-bold">
                            ห้อง {rm.room}
                          </td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono">{rm.studentCount} คน</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono">{rm.avgScore.toFixed(1)}</td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold">
                            {rm.avgGpa.toFixed(2)}
                          </td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold text-emerald-900 bg-emerald-50/60">
                            {rm.indicatorPassed} คน ({rm.indicatorPassPct}%)
                          </td>
                          <td className="border border-slate-600 px-2 py-1.5 font-mono font-bold text-rose-800 bg-rose-50/60">
                            {rm.indicatorFailed} คน ({100 - rm.indicatorPassPct}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Part 2: Complete Student Score, Attendance & Evaluation Roster */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
                <h3 className="text-xs font-extrabold text-slate-950">
                  ส่วนที่ ๒ บัญชีรายชื่อ เวลาเรียน คะแนนเก็บ และผลการประเมินรายบุคคล
                </h3>
                <span className="text-[11px] text-slate-600 font-medium">
                  สัดส่วนคะแนน ปพ.๕: ระหว่างภาค {courseCfg.scoreRatioMid} : ปลายภาค {courseCfg.scoreRatioFinal} (เทียบฐาน 100 คะแนน)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1.5 w-10">ที่</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-2 text-left min-w-44">เลขประจำตัว / ชื่อ-สกุล</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1.5 w-14">ห้อง</th>
                      <th colSpan={2} className="border border-slate-600 py-1 px-1">เวลาเรียน ({totalHours} ชม.)</th>
                      <th colSpan={4} className="border border-slate-600 py-1 px-1">คะแนนระหว่างภาค (๖๐)</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-14">ปลายภาค<br />(๔๐)</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-14 bg-amber-50">รวม<br />(๑๐๐)</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-14 bg-slate-200">ระดับผล<br />การเรียน</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-16">คุณลักษณะ<br />(๓)</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-16">อ่านคิดฯ<br />(๓)</th>
                      <th rowSpan={2} className="border border-slate-600 py-2 px-1 w-16">สมรรถนะ<br />(๓)</th>
                    </tr>
                    <tr className="bg-slate-50 text-[10px] font-semibold text-slate-800">
                      <th className="border border-slate-600 py-1 px-1 w-14">มา/ทั้งหมด</th>
                      <th className="border border-slate-600 py-1 px-1 w-14">ร้อยละ</th>
                      <th className="border border-slate-600 py-1 px-1 w-12">ชิ้นงาน<br />(๒๐)</th>
                      <th className="border border-slate-600 py-1 px-1 w-12">ย่อย<br />(๑๐)</th>
                      <th className="border border-slate-600 py-1 px-1 w-12">กลางภาค<br />(๓๐)</th>
                      <th className="border border-slate-600 py-1 px-1 w-12 bg-slate-100">รวม<br />(๖๐)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="border border-slate-500 py-6 text-slate-500">
                          {rows.length === 0
                            ? 'ยังไม่มีนักเรียนลงทะเบียนหรือบันทึกคะแนนในรายวิชานี้'
                            : 'ไม่พบนักเรียนที่ตรงกับคำค้นหา'}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => {
                        const isVisible =
                          activeSection === 'all' ||
                          (idx >= currentPp5Page * pp5PageSize && idx < (currentPp5Page + 1) * pp5PageSize);
                        return (
                          <tr
                            key={row.student.id}
                            className={`${isVisible ? '' : 'hidden print:table-row'} hover:bg-slate-50`}
                          >
                            <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                            <td className="border border-slate-400 py-1.5 px-2 text-left">
                              <span className="font-semibold text-slate-900">
                                {getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}
                              </span>
                              <span className="block text-[10px] text-slate-600 font-mono">
                                {row.student.studentIdNumber}
                              </span>
                            </td>
                            <td className="border border-slate-400 py-1.5 text-[11px]">{row.student.room}</td>
                            <td className="border border-slate-400 py-1.5 font-mono text-[11px]">
                              {row.attendanceDetail.attendedHours}/{row.attendanceDetail.totalScheduledHours}
                            </td>
                            <td
                              className={`border border-slate-400 py-1.5 font-mono font-bold text-[11px] ${
                                row.isMs ? 'text-rose-700 bg-rose-50' : 'text-emerald-800'
                              }`}
                            >
                              {row.attendanceDetail.attendancePercent}%{row.isMs ? ' (มส.)' : ''}
                            </td>
                            <td className="border border-slate-400 py-1.5 font-mono">
                              {row.grade ? row.grade.assignmentScore : '-'}
                            </td>
                            <td className="border border-slate-400 py-1.5 font-mono">
                              {row.grade ? row.grade.quizScore : '-'}
                            </td>
                            <td className="border border-slate-400 py-1.5 font-mono">
                              {row.grade ? row.grade.midtermScore : '-'}
                            </td>
                            <td className="border border-slate-400 py-1.5 font-mono font-semibold bg-slate-50">
                              {row.courseworkSubtotal ?? '-'}
                            </td>
                            <td className="border border-slate-400 py-1.5 font-mono">
                              {row.grade ? row.grade.finalScore : '-'}
                            </td>
                            <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                              {row.grade ? (
                                <span>
                                  {isPrimaryCourse ? `${row.grade.totalScore}%` : row.grade.totalScore}
                                </span>
                              ) : '-'}
                            </td>
                            <td
                              className={`border border-slate-400 py-1.5 font-mono font-extrabold text-sm ${
                                row.isMs || row.finalLetter === '0' || row.finalLetter === 'F' || row.finalLetter === 'มผ'
                                  ? 'bg-rose-50 text-rose-800'
                                  : row.finalLetter === 'ร'
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-slate-100 text-slate-950'
                              }`}
                            >
                              {row.finalLetter}
                            </td>
                            <td className="border border-slate-400 py-1 px-1 text-[11px] font-medium">
                              {row.qualSummary.attrLabel}
                            </td>
                            <td className="border border-slate-400 py-1 px-1 text-[11px] font-medium">
                              {row.qualSummary.readingLabel}
                            </td>
                            <td className="border border-slate-400 py-1 px-1 text-[11px] font-medium">
                              {row.qualSummary.compLabel}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {activeSection !== 'all' &&
                renderPageControls(currentPp5Page, filteredRows.length, pp5PageSize, setPp5Page, 'PP5 pages', true)}
            </div>

            {/* Official Grading Criteria Reference */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] bg-slate-50 p-3.5 rounded-lg border border-slate-400">
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">๑. เกณฑ์ตัดสินระดับผลการเรียน ๘ ระดับ</span>
                <span className="text-slate-700 leading-relaxed">
                  ๔ (๘๐–๑๐๐) • ๓.๕ (๗๕–๗๙) • ๓ (๗๐–๗๔) • ๒.๕ (๖๕–๖๙) • ๒ (๖๐–๖๔) • ๑.๕ (๕๕–๕๙) • ๑ (๕๐–๕๔) • ๐ (๐–๔๙)
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">๒. เกณฑ์เวลาเรียนและอักษรแสดงผลการเรียน</span>
                <span className="text-slate-700 leading-relaxed">
                  เวลาเรียนต้องไม่น้อยกว่าร้อยละ ๘๐ ({minAttendanceHours} จาก {totalHours} ชม.) หากไม่ถึงเกณฑ์ให้ระดับ มส. • ขาดส่งงาน/สอบสำคัญให้ ร
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">๓. ระดับผลการประเมินด้านอื่นๆ (๐–๓)</span>
                <span className="text-slate-700 leading-relaxed">
                  ระดับ ๓ = ดีเยี่ยม • ระดับ ๒ = ดี • ระดับ ๑ = ผ่านเกณฑ์ขั้นต่ำ • ระดับ ๐ = ไม่ผ่านเกณฑ์
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            SECTION 2 (Item 3): สถิติการมาเรียนและบันทึกเวลาเรียน (80% สพฐ.)
           =============================================================== */}
        {showAttendance && (
          <div className="space-y-3 break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
              <h3 className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-800" />
                <span>สถิติการมาเรียนและเวลาเรียนประจำรายวิชา (เกณฑ์ ๘๐% ตามระเบียบ สพฐ.)</span>
              </h3>
              <div className="text-[11px] font-mono tabular-nums text-slate-700">
                เวลาเรียนเต็ม: <strong>{totalHours} ชม.</strong> | ขั้นต่ำ 80%: <strong>{minAttendanceHours} ชม.</strong> | เฉลี่ยทั้งห้อง: <strong>{stats.avgAttendancePct}%</strong> | เสี่ยง มส.: <strong className="text-rose-700">{stats.msRiskCount} คน</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-1.5 w-10">ที่</th>
                    <th className="border border-slate-600 py-2 px-2 text-left min-w-44">เลขประจำตัว / ชื่อ-สกุล</th>
                    <th className="border border-slate-600 py-2 px-1.5 w-14">ห้อง</th>
                    <th className="border border-slate-600 py-2 px-1.5">บันทึกจริง<br />(ครั้ง/คาบ)</th>
                    <th className="border border-slate-600 py-2 px-1.5 bg-emerald-50">มาเรียน</th>
                    <th className="border border-slate-600 py-2 px-1.5 bg-amber-50">มาสาย</th>
                    <th className="border border-slate-600 py-2 px-1.5">ลาป่วย</th>
                    <th className="border border-slate-600 py-2 px-1.5">ลากิจ</th>
                    <th className="border border-slate-600 py-2 px-1.5 bg-rose-50">ขาดเรียน</th>
                    <th className="border border-slate-600 py-2 px-1.5">ชม.เรียนจริง<br />/ {totalHours}</th>
                    <th className="border border-slate-600 py-2 px-1.5">ร้อยละ</th>
                    <th className="border border-slate-600 py-2 px-2">เกณฑ์สิทธิ์สอบ (≥ 80%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => {
                    const att = row.attendanceDetail;
                    return (
                      <tr key={row.student.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                        <td className="border border-slate-400 py-1.5 px-2 text-left">
                          <span className="font-semibold">{getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}</span>
                          <span className="block text-[10px] font-mono text-slate-500">{row.student.studentIdNumber}</span>
                        </td>
                        <td className="border border-slate-400 py-1.5">{row.student.room}</td>
                        <td className="border border-slate-400 py-1.5 font-mono text-[11px]">
                          {att.recordedSessions > 0 ? `${att.recordedSessions}` : 'ตารางสอน'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono text-emerald-800 bg-emerald-50/40">{att.presentCount}</td>
                        <td className="border border-slate-400 py-1.5 font-mono text-amber-800 bg-amber-50/40">{att.lateCount}</td>
                        <td className="border border-slate-400 py-1.5 font-mono">{att.sickCount}</td>
                        <td className="border border-slate-400 py-1.5 font-mono">{att.leaveCount}</td>
                        <td className="border border-slate-400 py-1.5 font-mono text-rose-800 bg-rose-50/40">{att.absentCount}</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-semibold">
                          {att.attendedHours}/{att.totalScheduledHours}
                        </td>
                        <td className={`border border-slate-400 py-1.5 font-mono font-bold ${att.isAtRiskMs ? 'text-rose-700 bg-rose-50' : 'text-emerald-800'}`}>
                          {att.attendancePercent}%
                        </td>
                        <td className={`border border-slate-400 py-1.5 font-semibold text-[11px] ${att.isAtRiskMs ? 'text-rose-700 bg-rose-50' : 'text-emerald-800'}`}>
                          {att.isAtRiskMs ? 'ไม่มีสิทธิ์สอบ (เสี่ยง มส.)' : 'มีสิทธิ์สอบ (ผ่านเกณฑ์ 80%)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===============================================================
            SECTION 3 (Items 2, 4, 5, 6): มาตรฐานตัวชี้วัด หน่วย 1-3 & คะแนนตามตัวชี้วัด & การประเมินหน่วยการเรียนรู้
           =============================================================== */}
        {showIndicatorsUnits && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
              <div>
                <h3 className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-800" />
                  <span>มาตรฐานตัวชี้วัด หน่วยที่ ๑–๓, คะแนนตามตัวชี้วัด ({learningArea.nameTh}) และการประเมินหน่วยการเรียนรู้ ({getCategoryTypeLabel(selectedCourse.category)})</span>
                </h3>
              </div>
              {indicatorSets.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedObecUnits1To3}
                  disabled={seedingIndicators}
                  className="print:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{seedingIndicators ? 'กำลังนำเข้า...' : `นำเข้ามาตรฐานตัวชี้วัด หน่วย 1–3 (${learningArea.shortTh})`}</span>
                </button>
              )}
            </div>

            {indicatorSets.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-400 text-center text-xs text-slate-600">
                ยังไม่มีชุดตัวชี้วัดในรายวิชา {selectedCourse.code} — กดปุ่มด้านบนหรือไปที่แท็บ &quot;ตัวชี้วัด&quot; เพื่อนำเข้ามาตรฐานตัวชี้วัด หน่วยที่ 1–3
              </div>
            ) : (
              <>
                {/* Table A: มาตรฐานและตัวชี้วัด หน่วยที่ 1-3 */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900">
                    ๓.๑ มาตรฐานการเรียนรู้และตัวชี้วัด หน่วยที่ ๑–{indicatorSets.length} ({learningArea.nameTh})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse border border-slate-700 tabular-nums">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-900">
                          <th className="border border-slate-600 py-1.5 px-2 w-32 text-left">หน่วยการเรียนรู้</th>
                          <th className="border border-slate-600 py-1.5 px-2 w-24">รหัสมาตรฐาน</th>
                          <th className="border border-slate-600 py-1.5 px-2 w-24">รหัสตัวชี้วัด</th>
                          <th className="border border-slate-600 py-1.5 px-2 text-left">คำอธิบายตัวชี้วัดตามหลักสูตรแกนกลางฯ</th>
                          <th className="border border-slate-600 py-1.5 px-2 w-24">ประเภท (สพฐ.)</th>
                          <th className="border border-slate-600 py-1.5 px-2 w-16">คะแนนเต็ม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicatorSets.flatMap((set, uIdx) =>
                          set.indicators.map((ind, iIdx) => {
                            const isFormative = (ind.description || '').includes('ระหว่างทาง');
                            return (
                              <tr key={ind.id}>
                                {iIdx === 0 && (
                                  <td
                                    rowSpan={set.indicators.length}
                                    className="border border-slate-500 px-2 py-1.5 font-bold bg-slate-50 align-top"
                                  >
                                    หน่วยที่ {uIdx + 1}<br />
                                    <span className="font-normal text-[10px] text-slate-600">{set.unitTitle || set.title}</span>
                                  </td>
                                )}
                                <td className="border border-slate-400 px-2 py-1 text-center font-mono font-semibold">
                                  {set.standardCode || '-'}
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center font-mono font-bold">
                                  {ind.code || '-'}
                                </td>
                                <td className="border border-slate-400 px-2 py-1">{ind.title}</td>
                                <td className="border border-slate-400 px-2 py-1 text-center">
                                  {isFormative ? 'ระหว่างทาง' : 'ปลายทาง'}
                                </td>
                                <td className="border border-slate-400 px-2 py-1 text-center font-mono font-bold">
                                  {ind.maxScore}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table B: การประเมินหน่วยการเรียนรู้...(วิชา)...พื้นฐาน/เพิ่มเติม และคะแนนตามตัวชี้วัด */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900">
                    ๓.๒ การประเมินหน่วยการเรียนรู้ รายวิชา {selectedCourse.titleTh} ({getCategoryTypeLabel(selectedCourse.category)}) — คะแนนตามตัวชี้วัด
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-900">
                          <th className="border border-slate-600 py-2 px-1.5 w-10">ที่</th>
                          <th className="border border-slate-600 py-2 px-2 text-left min-w-44">เลขประจำตัว / ชื่อ-สกุล</th>
                          {indicatorSets.map((set, idx) => {
                            const maxU = set.indicators.reduce((sum, i) => sum + i.maxScore, 0);
                            return (
                              <th key={set.id} className="border border-slate-600 py-1.5 px-2 min-w-24">
                                หน่วยที่ {idx + 1}<br />
                                <span className="text-[10px] font-normal">({set.standardCode || 'มาตรฐาน'} · {maxU} คะแนน)</span>
                              </th>
                            );
                          })}
                          <th className="border border-slate-600 py-2 px-2 bg-amber-50">รวมตัวชี้วัด</th>
                          <th className="border border-slate-600 py-2 px-2">ร้อยละ</th>
                          <th className="border border-slate-600 py-2 px-2">ระดับคุณภาพหน่วย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, idx) => {
                          const unitPct = row.totalUnitMax > 0 ? Math.round((row.totalUnitEarned / row.totalUnitMax) * 100) : 0;
                          const unitFb = getRawScoreFeedback(row.hasAnyUnitScore ? unitPct : null);
                          return (
                            <tr key={row.student.id} className="hover:bg-slate-50">
                              <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                              <td className="border border-slate-400 py-1.5 px-2 text-left">
                                <span className="font-semibold">{getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}</span>
                                <span className="block text-[10px] font-mono text-slate-500">{row.student.studentIdNumber}</span>
                              </td>
                              {row.unitResults.map((u) => (
                                <td key={u.setId} className="border border-slate-400 py-1.5 font-mono">
                                  {u.hasRecorded ? (
                                    <span>
                                      <strong>{u.earned}</strong>/{u.maxScore}
                                      <span className="block text-[10px] text-slate-600">
                                        ผ่าน {u.passedCount}/{u.totalCount}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              ))}
                              <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                                {row.hasAnyUnitScore ? `${row.totalUnitEarned}/${row.totalUnitMax}` : '-'}
                              </td>
                              <td className="border border-slate-400 py-1.5 font-mono font-bold">
                                {row.hasAnyUnitScore ? `${unitPct}%` : '-'}
                              </td>
                              <td className="border border-slate-400 py-1.5 font-semibold text-[11px]">
                                {row.hasAnyUnitScore ? unitFb.labelTh : 'รอบันทึกคะแนน'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===============================================================
            SECTION 4 (Items 7, 9, 10): การประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ & เกณฑ์การประเมินฯ
           =============================================================== */}
        {showAttributes && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
              <h3 className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-slate-800" />
                <span>การประเมินคุณลักษณะอันพึงประสงค์ ๘ ประการ และเกณฑ์การประเมินคุณลักษณะอันพึงประสงค์ (สพฐ.)</span>
              </h3>
              <div className="print:hidden flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-600 font-semibold">กำหนดทั้งห้อง:</span>
                {([3, 2, 1] as const).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => handleBatchApplyAttributes(lv)}
                    className="px-2 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer"
                  >
                    {QUALITY_LABELS[lv]}
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment Table across 8 attributes */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-1.5 w-8">ที่</th>
                    <th className="border border-slate-600 py-2 px-2 text-left min-w-40">เลขประจำตัว / ชื่อ-สกุล</th>
                    {MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((attr) => (
                      <th key={attr.index} className="border border-slate-600 py-1.5 px-1 min-w-16" title={attr.titleTh}>
                        ข้อ {attr.index}<br />
                        <span className="text-[9px] font-normal block truncate max-w-20 mx-auto">
                          {attr.titleTh.replace(/^[๑-๘]+\.\s*/, '')}
                        </span>
                      </th>
                    ))}
                    <th className="border border-slate-600 py-2 px-2 bg-emerald-50 min-w-24">สรุปผล (สพฐ.)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => {
                    const summary = evaluateObecAttributeSummary(row.qualRecord.attributes);
                    return (
                      <tr key={row.student.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                        <td className="border border-slate-400 py-1.5 px-2 text-left">
                          <span className="font-semibold">{getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}</span>
                        </td>
                        {MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((attr, aIdx) => {
                          const val = row.qualRecord.attributes[aIdx] ?? 3;
                          return (
                            <td key={attr.index} className="border border-slate-400 py-1 px-0.5">
                              <span className="hidden print:inline font-mono font-bold">{val}</span>
                              <select
                                value={val}
                                onChange={(e) => {
                                  const nextScore = Number(e.target.value);
                                  updateStudentQualitative(row.student.id, (prev) => {
                                    const nextAttrs = [...prev.attributes];
                                    nextAttrs[aIdx] = nextScore;
                                    return { ...prev, attributes: nextAttrs };
                                  });
                                }}
                                className="print:hidden w-full bg-transparent text-center font-mono font-semibold cursor-pointer focus:outline-none"
                              >
                                <option value={3}>3</option>
                                <option value={2}>2</option>
                                <option value={1}>1</option>
                                <option value={0}>0</option>
                              </select>
                            </td>
                          );
                        })}
                        <td className={`border border-slate-400 py-1.5 px-2 font-bold ${summary.level === 0 ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50/70 text-emerald-900'}`}>
                          {summary.label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Rubric Table (Item 9: เกณฑ์การประเมินคุณลักษณะอันพึงประสงค์) */}
            <div className="space-y-2 break-inside-avoid">
              <h4 className="text-xs font-bold text-slate-900">
                เกณฑ์การประเมินคุณลักษณะอันพึงประสงค์ ๘ ประการ (ตามแนวทางปฏิบัติ สพฐ. กระทรวงศึกษาธิการ)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-700 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-center">
                      <th className="border border-slate-600 py-1.5 px-2 w-40 text-left">คุณลักษณะอันพึงประสงค์</th>
                      <th className="border border-slate-600 py-1.5 px-2 w-48 text-left">ตัวชี้วัดพฤติกรรมสำคัญ</th>
                      <th className="border border-slate-600 py-1.5 px-2">ดีเยี่ยม (๓)</th>
                      <th className="border border-slate-600 py-1.5 px-2">ดี (๒)</th>
                      <th className="border border-slate-600 py-1.5 px-2">ผ่าน (๑)</th>
                      <th className="border border-slate-600 py-1.5 px-2">ไม่ผ่าน (๐)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((item) => (
                      <tr key={item.index}>
                        <td className="border border-slate-400 px-2 py-1.5 font-bold align-top">{item.titleTh}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top text-slate-700">
                          {item.subIndicators.map((sub, i) => (
                            <div key={i}>• {sub}</div>
                          ))}
                        </td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">{item.level3Desc}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">{item.level2Desc}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">{item.level1Desc}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top text-rose-800">{item.level0Desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-400">
                {MOE_ATTRIBUTES_DECISION_RULES.map((rule) => (
                  <div key={rule.level}>
                    <span className="font-bold text-slate-900 block">{rule.label}</span>
                    <span className="text-slate-700">{rule.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            SECTION 5 (Items 8, 11): การประเมินการอ่าน คิดวิเคราะห์ และเขียน & เกณฑ์ฯ สพฐ.
           =============================================================== */}
        {showReading && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
              <h3 className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-slate-800" />
                <span>การประเมินผลการอ่าน คิดวิเคราะห์ และเขียน และเกณฑ์การประเมินการอ่าน คิด วิเคราะห์ และการเขียนสื่อความหมาย (สพฐ.)</span>
              </h3>
              <div className="print:hidden flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-600 font-semibold">กำหนดทั้งห้อง:</span>
                {([3, 2, 1] as const).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => handleBatchApplyReading(lv)}
                    className="px-2 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer"
                  >
                    {QUALITY_LABELS[lv]}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-1.5 w-8">ที่</th>
                    <th className="border border-slate-600 py-2 px-2 text-left min-w-44">เลขประจำตัว / ชื่อ-สกุล</th>
                    {MOE_READING_WRITING_RUBRIC.map((dim) => (
                      <th key={dim.index} className="border border-slate-600 py-1.5 px-1.5 min-w-24" title={dim.titleTh}>
                        ด้านที่ {dim.index}<br />
                        <span className="text-[10px] font-normal">{dim.shortTh}</span>
                      </th>
                    ))}
                    <th className="border border-slate-600 py-2 px-2 w-16">รวม (๑๕)</th>
                    <th className="border border-slate-600 py-2 px-2 w-14">ร้อยละ</th>
                    <th className="border border-slate-600 py-2 px-2 bg-emerald-50 min-w-24">สรุปผล (สพฐ.)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => {
                    const rwSum = row.qualRecord.readingWriting.slice(0, 5).reduce((a, b) => a + b, 0);
                    const rwSummary = evaluateObecReadingSummary(row.qualRecord.readingWriting);
                    return (
                      <tr key={row.student.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 py-1.5 font-mono">{idx + 1}</td>
                        <td className="border border-slate-400 py-1.5 px-2 text-left">
                          <span className="font-semibold">{getStudentShortPrefixTh(row.student)} {row.student.firstNameTh} {row.student.lastNameTh}</span>
                        </td>
                        {MOE_READING_WRITING_RUBRIC.map((dim, dIdx) => {
                          const val = row.qualRecord.readingWriting[dIdx] ?? 3;
                          return (
                            <td key={dim.index} className="border border-slate-400 py-1 px-1">
                              <span className="hidden print:inline font-mono font-bold">{val}</span>
                              <select
                                value={val}
                                onChange={(e) => {
                                  const nextScore = Number(e.target.value);
                                  updateStudentQualitative(row.student.id, (prev) => {
                                    const nextRw = [...prev.readingWriting];
                                    nextRw[dIdx] = nextScore;
                                    return { ...prev, readingWriting: nextRw };
                                  });
                                }}
                                className="print:hidden w-full bg-transparent text-center font-mono font-semibold cursor-pointer focus:outline-none"
                              >
                                <option value={3}>3 (ดีเยี่ยม)</option>
                                <option value={2}>2 (ดี)</option>
                                <option value={1}>1 (ผ่าน)</option>
                                <option value={0}>0 (ไม่ผ่าน)</option>
                              </select>
                            </td>
                          );
                        })}
                        <td className="border border-slate-400 py-1.5 font-mono font-bold">{rwSum}</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold">{rwSummary.percent}%</td>
                        <td className={`border border-slate-400 py-1.5 px-2 font-bold ${rwSummary.level === 0 ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50/70 text-emerald-900'}`}>
                          {rwSummary.label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official Rubric Table (Item 11: เกณฑ์การประเมินการอ่าน คิด วิเคราะห์ และการเขียนสื่อความหมาย) */}
            <div className="space-y-2 break-inside-avoid">
              <h4 className="text-xs font-bold text-slate-900">
                เกณฑ์การประเมินการอ่าน คิดวิเคราะห์ และการเขียนสื่อความหมาย ๕ ด้าน (ฉบับ สพฐ. กระทรวงศึกษาธิการ)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-700 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-center">
                      <th className="border border-slate-600 py-1.5 px-2 w-48 text-left">องค์ประกอบ / ตัวชี้วัด</th>
                      <th className="border border-slate-600 py-1.5 px-2">ดีเยี่ยม (๓)</th>
                      <th className="border border-slate-600 py-1.5 px-2">ดี (๒)</th>
                      <th className="border border-slate-600 py-1.5 px-2">ผ่าน (๑)</th>
                      <th className="border border-slate-600 py-1.5 px-2">ไม่ผ่าน (๐)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOE_READING_WRITING_RUBRIC.map((dim) => (
                      <tr key={dim.index}>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">
                          <span className="font-bold block">{dim.titleTh}</span>
                          <span className="text-[10px] text-slate-600">{dim.description}</span>
                        </td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">{dim.level3Desc}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">{dim.level2Desc}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top">{dim.level1Desc}</td>
                        <td className="border border-slate-400 px-2 py-1.5 align-top text-rose-800">{dim.level0Desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-400">
                {MOE_READING_DECISION_RULES.map((rule) => (
                  <div key={rule.level}>
                    <span className="font-bold text-slate-900 block">{rule.label} · {rule.scoreRange}</span>
                    <span className="text-slate-700">{rule.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            SECTION 6: ทบทวนและเปรียบเทียบมาตรฐาน สพฐ. และกระทรวงศึกษาธิการ
           =============================================================== */}
        {showObecAudit && (
          <div className="space-y-3 break-inside-avoid">
            <div className="border-b border-slate-300 pb-1.5">
              <h3 className="text-xs font-extrabold text-slate-950">
                การทบทวนและเปรียบเทียบความสอดคล้องกับมาตรฐาน สพฐ. และกระทรวงศึกษาธิการ
              </h3>
              <p className="text-[11px] text-slate-600">
                ตรวจสอบความครบถ้วนของรายวิชา {selectedCourse.code} ({selectedCourse.titleTh}) เทียบกับระเบียบวัดและประเมินผลตามหลักสูตรแกนกลางฯ พ.ศ. ๒๕๕๑ (ปรับปรุง ๒๕๖๐)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-2 w-10 text-center">ข้อ</th>
                    <th className="border border-slate-600 py-2 px-2.5 text-left w-56">องค์ประกอบเอกสาร / รายงาน</th>
                    <th className="border border-slate-600 py-2 px-2.5 text-left">ข้อกำหนดมาตรฐาน สพฐ. / ศธ.</th>
                    <th className="border border-slate-600 py-2 px-2.5 text-left">ผลการตรวจสอบข้อมูลในระบบปัจจุบัน</th>
                    <th className="border border-slate-600 py-2 px-2 w-28 text-center print:hidden">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {obecComplianceRows.map((item) => (
                    <tr key={item.no} className="hover:bg-slate-50">
                      <td className="border border-slate-400 py-2 px-2 text-center font-mono font-bold">{item.no}</td>
                      <td className="border border-slate-400 py-2 px-2.5 font-bold text-slate-900">{item.topic}</td>
                      <td className="border border-slate-400 py-2 px-2.5 text-slate-700">{item.obecRule}</td>
                      <td className={`border border-slate-400 py-2 px-2.5 font-semibold ${item.ready ? 'text-emerald-800 bg-emerald-50/40' : 'text-amber-800 bg-amber-50/40'}`}>
                        {item.ready ? '✓ ' : '• '}
                        {item.statusText}
                      </td>
                      <td className="border border-slate-400 py-2 px-2 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => setActiveSection(item.targetSection)}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-800 cursor-pointer"
                        >
                          เปิดดูส่วนนี้
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Part 4: 4-Tier Official MOE Approval Block (Always on Cover Summary / All) */}
        {showCoverSummary && (
          <div className="space-y-2 break-inside-avoid">
            <h3 className="text-xs font-extrabold text-slate-950 border-b border-slate-300 pb-1">
              ส่วนที่ ๔ การเสนอและการพิจารณาอนุมัติผลการเรียน
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-700 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 text-xs">
              <div className="p-3.5 flex flex-col justify-between min-h-36">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">๑. ครูผู้สอน</p>
                  <p className="text-[11px] text-slate-600">ได้ดำเนินการวัดและประเมินผลถูกต้องตามระเบียบฯ แล้ว</p>
                </div>
                <div className="pt-8 text-center space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-4"></div>
                  <p className="font-semibold">({selectedCourse.teacherName || '............................................'})</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>

              <div className="p-3.5 flex flex-col justify-between min-h-36">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">๒. หัวหน้ากลุ่มสาระการเรียนรู้</p>
                  <p className="text-[11px] text-slate-700">[  ] เห็นควรอนุมัติ   [  ] ปรับปรุงแก้ไข</p>
                </div>
                <div className="pt-8 text-center space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-4"></div>
                  <p className="font-semibold">({courseCfg.headOfDeptName.trim() || '............................................'})</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>

              <div className="p-3.5 flex flex-col justify-between min-h-36">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">๓. หัวหน้างานวัดและประเมินผล</p>
                  <p className="text-[11px] text-slate-700">[  ] ตรวจทานคะแนนและสถิติถูกต้อง</p>
                </div>
                <div className="pt-8 text-center space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-4"></div>
                  <p className="font-semibold">({courseCfg.measurementHeadName.trim() || '............................................'})</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>

              <div className="p-3.5 flex flex-col justify-between min-h-36 bg-slate-50/70">
                <div className="space-y-1">
                  <p className="font-bold text-slate-950">๔. ผู้อำนวยการสถานศึกษา</p>
                  <p className="text-[11px] font-semibold text-slate-800">[  ] อนุมัติ   [  ] ไม่อนุมัติ</p>
                </div>
                <div className="pt-8 text-center space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-4"></div>
                  <p className="font-semibold">({courseCfg.directorName.trim() || '............................................'})</p>
                  <p className="text-[11px] text-slate-600">วันที่อนุมัติ ....... / ............ / ...........</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// PP6 OFFICIAL FORM (แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล ปพ.๖)
// Synced with persisted moeQualitativeStore!
// =========================================================================
interface Pp6OfficialFormProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  systemConfig: SystemConfig;
  school?: School;
  selectedStudentIdForPp6: string;
  setSelectedStudentIdForPp6: (id: string) => void;
  currentPp6CoursePage: number;
  pp6CoursePageSize: number;
  setPp6CoursePage: (page: number) => void;
  renderPageControls: (
    page: number,
    totalItems: number,
    pageSize: number,
    setPage: (page: number) => void,
    label: string,
    isLight?: boolean
  ) => React.ReactNode;
}

const MOE_ATTRIBUTES = MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((a) => a.titleTh);

export const Pp6OfficialForm: React.FC<Pp6OfficialFormProps> = ({
  students,
  courses,
  grades,
  attendance,
  systemConfig,
  school,
  selectedStudentIdForPp6,
  setSelectedStudentIdForPp6,
  currentPp6CoursePage,
  pp6CoursePageSize,
  setPp6CoursePage,
  renderPageControls,
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';

  const [studentSearch, setStudentSearch] = useState('');
  const [commentCopied, setCommentCopied] = useState(false);
  const [qualitativeMap, setQualitativeMap] = useState<Record<string, StudentQualitativeAssessment>>(() =>
    loadQualitativeAssessments(schoolId, academicYear, semester)
  );
  const pp6PrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
  }, [schoolId, academicYear, semester]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [
        s.studentIdNumber,
        s.nationalId,
        `${s.firstNameTh} ${s.lastNameTh}`,
        `${s.firstNameEn} ${s.lastNameEn}`,
        s.room,
        s.gradeLevel,
      ].some((val) => (val || '').toLowerCase().includes(q))
    );
  }, [students, studentSearch]);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentIdForPp6) ||
    filteredStudents[0] ||
    students[0];

  const currentIdx = selectedStudent ? students.findIndex((s) => s.id === selectedStudent.id) : -1;

  const studentQual = useMemo(
    () =>
      selectedStudent
        ? getStudentQualitativeRecord(qualitativeMap, selectedStudent.id)
        : createDefaultStudentQualitative(''),
    [qualitativeMap, selectedStudent]
  );

  const studentQualSummary = useMemo(() => summarizeStudentQualitative(studentQual), [studentQual]);

  const updateSelectedStudentQual = (
    updater: (prev: StudentQualitativeAssessment) => StudentQualitativeAssessment
  ) => {
    if (!selectedStudent) return;
    setQualitativeMap((prev) => {
      const current = getStudentQualitativeRecord(prev, selectedStudent.id);
      const updated = { ...updater(current), updatedAt: new Date().toISOString() };
      const next = { ...prev, [selectedStudent.id]: updated };
      saveQualitativeAssessments(schoolId, academicYear, semester, next);
      return next;
    });
  };

  const defaultHomeroomComment =
    'นักเรียนมีความตั้งใจในการเรียน สนใจใฝ่รู้ รับผิดชอบงานที่ได้รับมอบหมายสม่ำเสมอ อยู่ร่วมกับเพื่อนและปฏิบัติตามระเบียบของสถานศึกษาได้เป็นอย่างดี';
  const homeroomComment = studentQual.homeroomComment ?? defaultHomeroomComment;

  const studentCourses = useMemo(() => {
    if (!selectedStudent) return [];
    const matched = courses.filter(
      (c) =>
        (c.enrolledStudentIds || []).includes(selectedStudent.id) ||
        grades.some((g) => g.courseId === c.id && g.studentId === selectedStudent.id)
    );
    return matched.length > 0 ? matched : courses;
  }, [courses, grades, selectedStudent]);

  const academicSummary = useMemo(() => {
    if (!selectedStudent) {
      return {
        isPrimary: false,
        isEarlyPrimary: false,
        hideGpaCalculations: false,
        gradedSubjectCount: 0,
        registeredCredits: 0,
        earnedCredits: 0,
        termGpa: '0.00',
        gpax: '0.00',
        averageRawScore: null as number | null,
        stageLabel: 'การศึกษาขั้นพื้นฐาน',
      };
    }
    const summary = calculateStudentAcademicSummary({
      student: selectedStudent,
      courses: studentCourses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: systemConfig.academicYear,
      currentSemester: systemConfig.currentSemester,
    });
    const emptyGpa = '0.00';
    return {
      isPrimary: summary.isPrimary,
      isEarlyPrimary: summary.isEarlyPrimary,
      hideGpaCalculations: summary.hideGpaCalculations,
      gradedSubjectCount: summary.gradedSubjectCount,
      registeredCredits: summary.registeredCredits,
      earnedCredits: summary.earnedCredits,
      termGpa: summary.hasRecordedGrades && summary.termGpa !== null ? summary.termGpa.toFixed(2) : emptyGpa,
      gpax: summary.hasRecordedGrades && summary.gpax !== null ? summary.gpax.toFixed(2) : emptyGpa,
      averageRawScore: summary.averageRawScore,
      stageLabel: getEducationStageLabelTh(summary.stage),
    };
  }, [studentCourses, grades, selectedStudent, systemConfig.gradingSystem, systemConfig.academicYear, systemConfig.currentSemester]);

  const pp6CycleEntries = useMemo(() => {
    if (!selectedStudent) return [];
    return aggregateGradesByAssessmentCycle({
      student: selectedStudent,
      courses: studentCourses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: systemConfig.academicYear,
      currentSemester: systemConfig.currentSemester,
    });
  }, [selectedStudent, studentCourses, grades, systemConfig.gradingSystem, systemConfig.academicYear, systemConfig.currentSemester]);

  const pp6GradeByCourseId = useMemo(
    () => new Map(pp6CycleEntries.map((entry) => [entry.grade.courseId, entry])),
    [pp6CycleEntries]
  );

  const pp6OverallFeedback = getRawScoreFeedback(academicSummary.averageRawScore);

  const attendanceStats = useMemo(() => {
    if (!selectedStudent) return { total: 0, present: 0, late: 0, leaveOrSick: 0, absent: 0, pct: '-' };
    const recs = attendance.filter((a) => a.studentId === selectedStudent.id);
    if (recs.length === 0) return { total: 0, present: 0, late: 0, leaveOrSick: 0, absent: 0, pct: '100.0%' };
    const present = recs.filter((r) => r.status === 'present').length;
    const late = recs.filter((r) => r.status === 'late').length;
    const leaveOrSick = recs.filter((r) => r.status === 'sick' || r.status === 'leave').length;
    const absent = recs.filter((r) => r.status === 'absent').length;
    const pct = (((present + late) / recs.length) * 100).toFixed(1) + '%';
    return { total: recs.length, present, late, leaveOrSick, absent, pct };
  }, [attendance, selectedStudent]);

  const generateSmartHomeroomComment = (tone: 'auto' | 'praise' | 'supportive') => {
    if (!selectedStudent) return;
    const fullName = `${getStudentShortPrefixTh(selectedStudent)} ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`.trim();
    const pctNum = parseFloat(attendanceStats.pct) || 100;
    const gpaxNum = parseFloat(academicSummary.gpax) || 0;
    const avgRaw = academicSummary.averageRawScore;

    const scoredEntries = pp6CycleEntries
      .map((entry) => {
        const crs = studentCourses.find((c) => c.id === entry.grade.courseId);
        return {
          title: crs?.titleTh || crs?.code || '',
          score: entry.grade.totalScore,
          passed: entry.resolved.passed,
        };
      })
      .filter((e) => e.title);
    const bestSubjects = scoredEntries
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((e) => e.title);
    const weakSubjects = scoredEntries
      .filter((e) => e.score < 60 || e.passed === false)
      .slice(0, 2)
      .map((e) => e.title);

    const attendanceNote =
      pctNum >= 95
        ? `มีเวลาเรียนสม่ำเสมอและตรงเวลาเป็นอย่างดี (${attendanceStats.pct})`
        : pctNum >= 85
          ? `มาเรียนสม่ำเสมอ (${attendanceStats.pct}) ปฏิบัติตามกฎระเบียบได้ดี`
          : `ควรเพิ่มความสม่ำเสมอในการมาเรียนให้เกินเกณฑ์ 80% (ปัจจุบัน ${attendanceStats.pct})`;

    const academicPhrase = academicSummary.hideGpaCalculations
      ? (avgRaw !== null ? `มีคะแนนประเมินเฉลี่ยรวม ${avgRaw}% (${pp6OverallFeedback.labelTh})` : 'อยู่ในระหว่างรวบรวมผลการประเมินรายปี')
      : (gpaxNum >= 3.5
          ? `มีผลสัมฤทธิ์ทางการเรียนดีเยี่ยม (GPA ${academicSummary.termGpa} / GPAX ${academicSummary.gpax})`
          : gpaxNum >= 2.5
            ? `มีผลสัมฤทธิ์ทางการเรียนอยู่ในเกณฑ์ดี (GPA ${academicSummary.termGpa})`
            : `ควรเสริมการทบทวนบทเรียนและส่งงานให้ครบถ้วนต่อเนื่อง (GPA ${academicSummary.termGpa})`);

    const resolvedTone =
      tone === 'auto'
        ? (weakSubjects.length > 0 || pctNum < 85 || (!academicSummary.hideGpaCalculations && gpaxNum > 0 && gpaxNum < 2.2)
            ? 'supportive'
            : 'praise')
        : tone;

    if (resolvedTone === 'praise') {
      const strengthText = bestSubjects.length > 0 ? ` โดดเด่นเป็นพิเศษในรายวิชา${bestSubjects.join(' และ')}` : '';
      updateSelectedStudentQual((prev) => ({
        ...prev,
        homeroomComment: `${fullName} ${academicPhrase}${strengthText} อีกทั้ง${attendanceNote} มีความรับผิดชอบและอยู่ร่วมกับเพื่อนได้อย่างเหมาะสม ขอชื่นชมและส่งเสริมให้พัฒนาศักยภาพอย่างต่อเนื่อง`,
      }));
      return;
    }

    const supportText = weakSubjects.length > 0 ? ` แนะนำให้ทบทวนเพิ่มเติมในรายวิชา${weakSubjects.join(' และ')} รวมถึงติดตามงานที่ค้างส่ง` : ' แนะนำให้จัดตารางทบทวนบทเรียนอย่างสม่ำเสมอ';
    updateSelectedStudentQual((prev) => ({
      ...prev,
      homeroomComment: `${fullName} ${academicPhrase} และ${attendanceNote}${supportText} ทั้งนี้ครูประจำชั้นยินดีร่วมมือกับผู้ปกครองในการดูแลช่วยเหลือและให้กำลังใจผู้เรียนอย่างใกล้ชิด`,
    }));
  };

  const handlePrintPp6 = () => {
    if (!pp6PrintRef.current || !selectedStudent) return;
    printHtmlElementInIsolatedFrame(
      pp6PrintRef.current.innerHTML,
      `ปพ6_${selectedStudent.studentIdNumber}`
    );
  };

  return (
    <div className="space-y-3">
      {/* Searchable Student Selector Bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 print:hidden flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="ค้นหาชื่อ-สกุล รหัสนักเรียน เลข ปชช. หรือห้อง..."
            className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          {studentSearch && (
            <button
              type="button"
              onClick={() => setStudentSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={selectedStudent?.id || ''}
          onChange={(e) => {
            setSelectedStudentIdForPp6(e.target.value);
            setPp6CoursePage(0);
          }}
          className="flex-1 min-w-56 px-3 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)]"
        >
          {filteredStudents.length === 0 ? (
            <option value="">ไม่พบนักเรียนที่ค้นหา</option>
          ) : (
            filteredStudents.map((stu) => (
              <option key={stu.id} value={stu.id}>
                {stu.studentIdNumber} - {stu.firstNameTh} {stu.lastNameTh} ({stu.room})
              </option>
            ))
          )}
        </select>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={currentIdx <= 0}
            onClick={() => {
              if (currentIdx > 0) {
                setSelectedStudentIdForPp6(students[currentIdx - 1].id);
                setPp6CoursePage(0);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>ก่อนหน้า</span>
          </button>
          <button
            type="button"
            disabled={currentIdx < 0 || currentIdx >= students.length - 1}
            onClick={() => {
              if (currentIdx >= 0 && currentIdx < students.length - 1) {
                setSelectedStudentIdForPp6(students[currentIdx + 1].id);
                setPp6CoursePage(0);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handlePrintPp6}
            className="btn-action-primary px-3 py-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ ปพ.๖ (A4)</span>
          </button>
        </div>
      </div>

      {selectedStudent && (
        <div
          ref={pp6PrintRef}
          className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-300 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none"
        >
          {/* Official P.P.6 Header */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              {school?.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.nameTh}
                  className="w-14 h-14 object-contain border border-slate-300 rounded-lg p-1 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-slate-900" />
                  <span className="text-[8px] font-bold">สพฐ.</span>
                </div>
              )}
              <div className="text-center flex-1 space-y-0.5">
                <p className="text-xs font-bold text-slate-700">
                  แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.๖)
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-950">
                  โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}
                </h2>
                <p className="text-[11px] text-slate-600">
                  สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน •{' '}
                  {academicSummary.isPrimary
                    ? `รายงานผลการประเมินรายปี ปีการศึกษา ${systemConfig.academicYear}`
                    : `${formatSemesterLabel(systemConfig.currentSemester)} ปีการศึกษา ${systemConfig.academicYear}`}{' '}
                  ({academicSummary.stageLabel})
                </p>
              </div>
              <div className="border-2 border-slate-900 px-3 py-1.5 text-center shrink-0">
                <div className="text-sm font-extrabold">ปพ.๖</div>
                <div className="text-[10px] font-mono">{academicSummary.isPrimary ? 'รายปี' : 'รายภาค'}</div>
              </div>
            </div>

            {/* Student Identity Grid */}
            <table className="w-full text-xs border-collapse border border-slate-700">
              <tbody>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-32">ชื่อ - สกุล ผู้เรียน</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-bold text-slate-950">
                    {getStudentShortPrefixTh(selectedStudent)}{' '}
                    {selectedStudent.firstNameTh} {selectedStudent.lastNameTh}
                    <span className="ml-2 text-slate-600 font-normal">({selectedStudent.firstNameEn} {selectedStudent.lastNameEn})</span>
                  </td>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold w-32">เลขประจำตัว</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-mono font-bold tabular-nums">
                    {selectedStudent.studentIdNumber}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">เลขประชาชน (13 หลัก)</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-mono tabular-nums">
                    {selectedStudent.nationalId || '-'}
                  </td>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ระดับชั้น / ห้อง</td>
                  <td className="border border-slate-500 px-3 py-1.5 font-semibold">
                    {selectedStudent.gradeLevel} ({selectedStudent.room})
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">วัน/เดือน/ปีเกิด</td>
                  <td className="border border-slate-500 px-3 py-1.5 tabular-nums">{selectedStudent.dateOfBirth || '-'}</td>
                  <td className="border border-slate-500 px-3 py-1.5 bg-slate-100 font-bold">ผู้ปกครอง</td>
                  <td className="border border-slate-500 px-3 py-1.5">
                    {selectedStudent.guardianName} ({selectedStudent.guardianRelation})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 1: Subject Grades Table */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
              <h3 className="text-xs font-extrabold text-slate-950">
                ตอนที่ ๑ ผลการพัฒนาคุณภาพผู้เรียนรายวิชา ({academicSummary.isPrimary ? 'ประเมินผลรายปี' : 'ประเมินผลรายภาคเรียน'})
              </h3>
              {academicSummary.isPrimary && (
                <span className="text-[11px] font-semibold text-sky-900">
                  {academicSummary.isEarlyPrimary
                    ? 'ป.๑–ป.๓: สื่อสารด้วยคะแนนดิบ (เต็ม ๑๐๐) / ร้อยละ (%) และสรุปเกรด ๐–๔ รายปี'
                    : 'ประถมศึกษา: ประเมินรายปี เกรด ๐–๔ ควบคู่คะแนนดิบ (เต็ม ๑๐๐) / ร้อยละ (%)'}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-700 text-center tabular-nums">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 py-2 px-2 w-10">ที่</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">รหัสวิชา</th>
                    <th className="border border-slate-600 py-2 px-2 text-left">รายวิชา</th>
                    <th className="border border-slate-600 py-2 px-2 w-28">กลุ่มสาระฯ</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">ประเภท</th>
                    <th className="border border-slate-600 py-2 px-2 w-16">{academicSummary.isPrimary ? 'น้ำหนัก' : 'หน่วยกิต'}</th>
                    <th className="border border-slate-600 py-2 px-2 w-24 bg-amber-50">คะแนนที่ได้ (%)</th>
                    <th className="border border-slate-600 py-2 px-2 w-20 bg-slate-200">ระดับผลการเรียน</th>
                    <th className="border border-slate-600 py-2 px-2 w-24">ผลการตัดสิน</th>
                  </tr>
                </thead>
                <tbody>
                  {studentCourses.map((course, index) => {
                    const cycleEntry = pp6GradeByCourseId.get(course.id);
                    const grade =
                      cycleEntry?.grade ||
                      grades.find((g) => g.courseId === course.id && g.studentId === selectedStudent.id);
                    const resolved =
                      cycleEntry?.resolved ||
                      resolveEffectiveGrade(grade, course, systemConfig.gradingSystem, false);
                    const rawFeedback = grade ? getRawScoreFeedback(grade.totalScore) : null;
                    const area = resolveMoeLearningArea(course);
                    const isVisible =
                      index >= currentPp6CoursePage * pp6CoursePageSize &&
                      index < (currentPp6CoursePage + 1) * pp6CoursePageSize;

                    return (
                      <tr
                        key={course.id}
                        className={`${isVisible ? '' : 'hidden print:table-row'} hover:bg-slate-50`}
                      >
                        <td className="border border-slate-400 py-1.5 font-mono">{index + 1}</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold">{course.code}</td>
                        <td className="border border-slate-400 py-1.5 px-2.5 text-left font-medium">
                          {course.titleTh}
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px] text-slate-600">
                          {area.shortTh}
                        </td>
                        <td className="border border-slate-400 py-1.5 text-[11px] text-slate-600">
                          {getCategoryTypeLabel(course.category)}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {resolved.isActivity || course.credits <= 0 ? '-' : course.credits.toFixed(1)}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                          {grade ? `${grade.totalScore}%` : '-'}
                        </td>
                        <td className={`border border-slate-400 py-1.5 font-mono font-extrabold ${
                          resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ'
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-slate-100 text-slate-950'
                        }`}>
                          {resolved.letter}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-semibold text-[11px] ${
                            resolved.passed === true
                              ? 'text-emerald-800'
                              : resolved.passed === false
                                ? 'text-rose-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {academicSummary.isPrimary && rawFeedback && !resolved.isSpecial
                            ? rawFeedback.labelTh
                            : resolved.passed === true
                            ? 'ผ่านเกณฑ์'
                            : resolved.passed === false
                            ? (resolved.isSpecial ? resolved.letter : 'ไม่ผ่านเกณฑ์')
                            : 'รอประเมิน'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-700">
                    {academicSummary.hideGpaCalculations ? (
                      <>
                        <td colSpan={5} className="border border-slate-600 py-2 px-3 text-left">
                          สรุปผลการประเมินรายปี (ป.1–ป.6 • {academicSummary.gradedSubjectCount} รายวิชา)
                        </td>
                        <td colSpan={2} className="border border-slate-600 py-2 px-3 text-right font-mono text-sm">
                          เฉลี่ย: {academicSummary.averageRawScore !== null ? `${academicSummary.averageRawScore}%` : '-'}
                        </td>
                        <td colSpan={2} className="border border-slate-600 py-2 px-3 text-right font-semibold text-sm text-emerald-900">
                          {pp6OverallFeedback.labelTh}
                        </td>
                      </>
                    ) : (
                      <>
                        <td colSpan={5} className="border border-slate-600 py-2 px-3 text-left">
                          สรุปผลการเรียนประจำภาคเรียน (ม.1–ม.6)
                        </td>
                        <td className="border border-slate-600 py-2 font-mono">
                          {academicSummary.registeredCredits.toFixed(1)}
                        </td>
                        <td colSpan={1} className="border border-slate-600 py-2 px-2 text-right font-mono">
                          ได้ {academicSummary.earnedCredits.toFixed(1)} นก.
                        </td>
                        <td colSpan={2} className="border border-slate-600 py-2 px-3 text-right font-mono text-sm">
                          GPA: {academicSummary.termGpa} | GPAX: {academicSummary.gpax}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
            {renderPageControls(
              currentPp6CoursePage,
              studentCourses.length,
              pp6CoursePageSize,
              setPp6CoursePage,
              'PP6 course pages',
              true
            )}
          </div>

          {/* Section 2: 8 Desirable Attributes, 5 Reading/Writing Dimensions, Competencies & Activities */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-950 border-b border-slate-300 pb-1">
              ตอนที่ ๒ การประเมินคุณลักษณะอันพึงประสงค์ การอ่านคิดวิเคราะห์ สมรรถนะ และกิจกรรมพัฒนาผู้เรียน (ซิงค์ข้อมูลกับ ปพ.๕)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 8 MOE Desirable Attributes Table */}
              <table className="w-full text-xs border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 px-2.5 py-1.5 text-left">คุณลักษณะอันพึงประสงค์ ๘ ประการ</th>
                    <th className="border border-slate-600 px-2 py-1.5 text-center w-28">ผลการประเมิน</th>
                  </tr>
                </thead>
                <tbody>
                  {MOE_ATTRIBUTES.map((attr, idx) => {
                    const numVal = studentQual.attributes[idx] ?? 3;
                    const textVal = QUALITY_LABELS[numVal] || 'ดีเยี่ยม (๓)';
                    return (
                      <tr key={attr}>
                        <td className="border border-slate-400 px-2.5 py-1">{attr}</td>
                        <td className="border border-slate-400 px-2 py-1 text-center font-semibold text-emerald-800">
                          <span className="hidden print:inline">{textVal}</span>
                          <select
                            value={numVal}
                            onChange={(e) => {
                              const nextNum = Number(e.target.value);
                              updateSelectedStudentQual((prev) => {
                                const nextAttrs = [...prev.attributes];
                                nextAttrs[idx] = nextNum;
                                return { ...prev, attributes: nextAttrs };
                              });
                            }}
                            className="print:hidden w-full bg-transparent text-center font-semibold text-emerald-800 focus:outline-none cursor-pointer"
                          >
                            <option value={3}>ดีเยี่ยม (๓)</option>
                            <option value={2}>ดี (๒)</option>
                            <option value={1}>ผ่าน (๑)</option>
                            <option value={0}>ไม่ผ่าน (๐)</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-600 px-2.5 py-1.5">สรุปผลการประเมินคุณลักษณะอันพึงประสงค์ (เกณฑ์ สพฐ.)</td>
                    <td className="border border-slate-600 px-2 py-1.5 text-center text-emerald-900">
                      {studentQualSummary.attrLabel}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Student Development Activities & 5 Reading/Writing Dimensions & Competencies */}
              <div className="space-y-3">
                <table className="w-full text-xs border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-600 px-2.5 py-1.5 text-left">กิจกรรมพัฒนาผู้เรียน</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-16">เวลา</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-24">ผลการเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOE_STUDENT_ACTIVITIES.map((act, idx) => {
                      const val = studentQual.activities[idx] || act.defaultResult;
                      return (
                        <tr key={act.name}>
                          <td className="border border-slate-400 px-2.5 py-1.5">{act.name}</td>
                          <td className="border border-slate-400 px-2 py-1.5 text-center font-mono">{act.hours}</td>
                          <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">
                            <span className="hidden print:inline">{val}</span>
                            <select
                              value={val}
                              onChange={(e) => {
                                const nextAct = e.target.value as 'ผ (ผ่าน)' | 'มผ (ไม่ผ่าน)';
                                updateSelectedStudentQual((prev) => {
                                  const nextActs = [...prev.activities];
                                  nextActs[idx] = nextAct;
                                  return { ...prev, activities: nextActs };
                                });
                              }}
                              className="print:hidden w-full bg-transparent text-center font-bold text-emerald-800 focus:outline-none cursor-pointer"
                            >
                              <option value="ผ (ผ่าน)">ผ (ผ่าน)</option>
                              <option value="มผ (ไม่ผ่าน)">มผ (ไม่ผ่าน)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <table className="w-full text-xs border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-600 px-2.5 py-1.5 text-left">การอ่าน คิดวิเคราะห์ และเขียน (๕ ด้าน) &amp; สมรรถนะ</th>
                      <th className="border border-slate-600 px-2 py-1.5 text-center w-28">ระดับคุณภาพ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOE_READING_WRITING_RUBRIC.map((dim, dIdx) => {
                      const val = studentQual.readingWriting[dIdx] ?? 3;
                      return (
                        <tr key={dim.index}>
                          <td className="border border-slate-400 px-2.5 py-1">{dim.titleTh}</td>
                          <td className="border border-slate-400 px-2 py-1 text-center font-semibold text-emerald-800">
                            <span className="hidden print:inline">{QUALITY_LABELS[val]}</span>
                            <select
                              value={val}
                              onChange={(e) => {
                                const nextNum = Number(e.target.value);
                                updateSelectedStudentQual((prev) => {
                                  const nextRw = [...prev.readingWriting];
                                  nextRw[dIdx] = nextNum;
                                  return { ...prev, readingWriting: nextRw };
                                });
                              }}
                              className="print:hidden w-full bg-transparent text-center font-semibold text-emerald-800 focus:outline-none cursor-pointer"
                            >
                              <option value={3}>ดีเยี่ยม (๓)</option>
                              <option value={2}>ดี (๒)</option>
                              <option value={1}>ผ่าน (๑)</option>
                              <option value={0}>ไม่ผ่าน (๐)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold">
                      <td className="border border-slate-600 px-2.5 py-1.5">
                        สรุปผลการอ่าน คิดวิเคราะห์ และเขียน ({studentQualSummary.readingPercent}%)
                      </td>
                      <td className="border border-slate-600 px-2 py-1.5 text-center text-emerald-900">
                        {studentQualSummary.readingLabel}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 px-2.5 py-1.5 font-medium">
                        สมรรถนะสำคัญของผู้เรียน ๕ ประการ ({MOE_KEY_COMPETENCIES.length} ด้าน)
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5 text-center font-bold text-emerald-800">
                        <span className="hidden print:inline">{studentQualSummary.compLabel}</span>
                        <select
                          value={studentQualSummary.compLevel}
                          onChange={(e) => {
                            const nextNum = Number(e.target.value);
                            updateSelectedStudentQual((prev) => ({
                              ...prev,
                              competencies: Array(5).fill(nextNum),
                            }));
                          }}
                          className="print:hidden w-full bg-transparent text-center font-bold text-emerald-800 focus:outline-none cursor-pointer"
                        >
                          <option value={3}>ดีเยี่ยม (๓)</option>
                          <option value={2}>ดี (๒)</option>
                          <option value={1}>ผ่าน (๑)</option>
                          <option value={0}>ไม่ผ่าน (๐)</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Attendance, Advisor Opinion & Parent Acknowledgment */}
          <div className="space-y-3 break-inside-avoid">
            <h3 className="text-xs font-extrabold text-slate-950 border-b border-slate-300 pb-1">
              ตอนที่ ๓ สถิติเวลาเรียน ความคิดเห็นครูประจำชั้น และการรับทราบของผู้ปกครอง
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center tabular-nums">
              <div className="p-2 rounded border border-slate-400 bg-slate-50">
                <span className="text-[10px] text-slate-600 block font-semibold">บันทึกเวลาทั้งหมด</span>
                <span className="font-mono font-bold text-sm">{attendanceStats.total} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-emerald-50/60">
                <span className="text-[10px] text-emerald-800 block font-semibold">มาเรียน</span>
                <span className="font-mono font-bold text-sm text-emerald-900">{attendanceStats.present} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-amber-50/60">
                <span className="text-[10px] text-amber-800 block font-semibold">มาสาย</span>
                <span className="font-mono font-bold text-sm text-amber-900">{attendanceStats.late} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-slate-50">
                <span className="text-[10px] text-slate-700 block font-semibold">ลาป่วย / ลากิจ / ขาด</span>
                <span className="font-mono font-bold text-sm">{attendanceStats.leaveOrSick} / {attendanceStats.absent} วัน</span>
              </div>
              <div className="p-2 rounded border border-slate-400 bg-slate-100">
                <span className="text-[10px] text-slate-700 block font-semibold">ร้อยละการมาเรียน</span>
                <span className="font-mono font-extrabold text-sm text-slate-950">{attendanceStats.pct}</span>
              </div>
            </div>

            <div className="border border-slate-600 p-3 rounded space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-slate-900 block">ความคิดเห็นและข้อเสนอแนะของครูประจำชั้น:</label>
                <div className="print:hidden flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => generateSmartHomeroomComment('auto')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold cursor-pointer transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>ร่างอัตโนมัติจากข้อมูลจริง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => generateSmartHomeroomComment('praise')}
                    className="px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-semibold cursor-pointer transition"
                  >
                    ชมเชย/ส่งเสริม
                  </button>
                  <button
                    type="button"
                    onClick={() => generateSmartHomeroomComment('supportive')}
                    className="px-2 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold cursor-pointer transition"
                  >
                    ให้กำลังใจ/เฝ้าระวัง
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        void navigator.clipboard.writeText(homeroomComment);
                        setCommentCopied(true);
                        setTimeout(() => setCommentCopied(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer transition"
                  >
                    {commentCopied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{commentCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={homeroomComment}
                onChange={(e) =>
                  updateSelectedStudentQual((prev) => ({
                    ...prev,
                    homeroomComment: e.target.value,
                  }))
                }
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded p-2 print:border-none print:bg-transparent print:p-0 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-700 divide-y sm:divide-y-0 sm:divide-x divide-slate-700 text-xs text-center">
              <div className="p-3.5 flex flex-col justify-between min-h-32">
                <p className="font-bold text-slate-900">ครูประจำชั้น / ครูที่ปรึกษา</p>
                <div className="pt-8 space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-6"></div>
                  <p>(.....................................................)</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>
              <div className="p-3.5 flex flex-col justify-between min-h-32">
                <p className="font-bold text-slate-900">ผู้ปกครองรับทราบผลการเรียน</p>
                <p className="text-[11px] text-slate-700 mt-1">[  ] รับทราบผลการพัฒนาคุณภาพผู้เรียนแล้ว</p>
                <div className="pt-6 space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-6"></div>
                  <p>({selectedStudent.guardianName || '.....................................................'})</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>
              <div className="p-3.5 flex flex-col justify-between min-h-32 bg-slate-50/70">
                <p className="font-bold text-slate-950">ผู้อำนวยการสถานศึกษา</p>
                <div className="pt-8 space-y-1">
                  <div className="border-b border-dotted border-slate-500 mx-6"></div>
                  <p>(.....................................................)</p>
                  <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
