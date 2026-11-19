import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  BehaviorRecord,
  Course,
  GradeRecord,
  LearningIndicatorScore,
  LearningIndicatorSet,
  PeriodAttendanceRecord,
  School,
  SdqAssessment,
  Student,
  SystemConfig,
  TimetableSlot,
} from '../types';
import {
  createObcUnitSetsForCourse,
  MOE_DESIRABLE_ATTRIBUTES_RUBRIC,
  MOE_KEY_COMPETENCIES,
  MOE_READING_WRITING_RUBRIC,
  MOE_STUDENT_ACTIVITIES,
  resolveMoeLearningArea,
} from '../data/moeCurriculumStandards';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
  isActivityCourse,
  resolveEffectiveGrade,
} from '../lib/moeGrading';
import {
  loadLearningIndicatorScores,
  loadLearningIndicatorSets,
} from '../lib/learningIndicatorStore';
import {
  calculateDetailedCourseAttendance,
  createDefaultStudentQualitative,
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import {
  downloadMoeGradeSummaryPdf,
  printHtmlElementInIsolatedFrame,
} from '../lib/moeReportPdf';
import { formatSemesterLabel } from '../lib/schoolSettings';

interface CoreSubjectsReportCardViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  systemConfig: SystemConfig;
  school?: School;
  initialStudentId?: string;
  lang?: AppLanguage;
  onOpenStudentDevBook?: (studentId: string) => void;
}

const QUALITY_TEXT: Record<number, string> = {
  3: 'ดีเยี่ยม (๓)',
  2: 'ดี (๒)',
  1: 'ผ่าน (๑)',
  0: 'ไม่ผ่าน (๐)',
};

/**
 * Determine if a course belongs to Basic/Core Curriculum Subjects (รายวิชาพื้นฐาน)
 * matching OBEC course structure: category === 'core', explicit 'พื้นฐาน',
 * OBEC code digit `1xx` (e.g. ท21101, ค31101), or standard 8-strand subjects not marked elective/activity.
 */
function isCoreBasicCourse(course: Course): boolean {
  if (isActivityCourse(course)) return false;
  const title = (course.titleTh || '').trim();
  const dept = (course.department || '').trim();
  const cat = (course.category || '').trim().toLowerCase();

  if (cat === 'core' || title.includes('พื้นฐาน') || dept.includes('พื้นฐาน')) return true;
  if (cat === 'elective' || title.includes('เพิ่มเติม') || dept.includes('เพิ่มเติม')) return false;

  const normalizedCode = (course.code || '').trim().replace(/\s+/g, '');
  if (/^[ก-ฮ]\d{2}2\d{2}$/.test(normalizedCode)) return false; // รายวิชาเพิ่มเติม (รหัส x2xx)
  if (/^[ก-ฮ]\d{2}1\d{2}$/.test(normalizedCode)) return true; // รายวิชาพื้นฐาน (รหัส x1xx)

  return true;
}

export const CoreSubjectsReportCardView: React.FC<CoreSubjectsReportCardViewProps> = ({
  students,
  courses,
  grades,
  attendance,
  periodAttendance = [],
  timetableSlots = [],
  behaviorRecords = [],
  sdqAssessments = [],
  systemConfig,
  school,
  initialStudentId,
  lang = 'th',
  onOpenStudentDevBook,
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';
  const schoolNameTh = school?.nameTh || systemConfig.schoolNameTh || 'สถานศึกษา';

  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || ''
  );
  const [coreOnly, setCoreOnly] = useState(true);
  const [showSignatoriesPanel, setShowSignatoriesPanel] = useState(false);
  const [advisorName, setAdvisorName] = useState('');
  const [measurementHeadName, setMeasurementHeadName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [qualitativeMap, setQualitativeMap] = useState(() =>
    loadQualitativeAssessments(schoolId, academicYear, semester)
  );
  const [indicatorByCourse, setIndicatorByCourse] = useState<
    Record<string, { passed: number; total: number; isReal: boolean }>
  >({});

  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialStudentId && students.some((s) => s.id === initialStudentId)) {
      setSelectedStudentId(initialStudentId);
      setRoomFilter('all');
    }
  }, [initialStudentId, students]);

  useEffect(() => {
    setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
  }, [schoolId, academicYear, semester]);

  const roomOptions = useMemo(() => {
    return Array.from(new Set(students.map((s) => (s.room || '').trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'th')
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (roomFilter !== 'all' && (s.room || '').trim() !== roomFilter) return false;
      if (!q) return true;
      return [
        s.studentIdNumber,
        s.nationalId,
        `${s.firstNameTh} ${s.lastNameTh}`,
        `${s.firstNameEn} ${s.lastNameEn}`,
        s.room,
        s.gradeLevel,
      ].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [roomFilter, searchQuery, students]);

  const selectedStudent =
    filteredStudents.find((s) => s.id === selectedStudentId) ||
    students.find((s) => s.id === selectedStudentId) ||
    filteredStudents[0] ||
    students[0];

  const currentIdx = selectedStudent
    ? filteredStudents.findIndex((s) => s.id === selectedStudent.id)
    : -1;

  // Resolve student's courses (Core vs All)
  const studentCourses = useMemo(() => {
    if (!selectedStudent) return [];
    const enrolled = courses.filter(
      (c) =>
        (c.enrolledStudentIds || []).includes(selectedStudent.id) ||
        grades.some((g) => g.courseId === c.id && g.studentId === selectedStudent.id)
    );
    const pool = enrolled.length > 0 ? enrolled : courses;
    if (!coreOnly) return pool.filter((c) => !isActivityCourse(c));
    const core = pool.filter(isCoreBasicCourse);
    return core.length > 0 ? core : pool.filter((c) => !isActivityCourse(c));
  }, [coreOnly, courses, grades, selectedStudent]);

  // Load learning indicators per subject synced with Student Development Book & ปพ.5
  useEffect(() => {
    let active = true;
    if (!selectedStudent || studentCourses.length === 0) {
      setIndicatorByCourse({});
      return;
    }

    const loadIndicators = async () => {
      const results = await Promise.all(
        studentCourses.map(async (course) => {
          const sets: LearningIndicatorSet[] = await loadLearningIndicatorSets({
            schoolId,
            courseId: course.id,
            academicYear,
            semester,
          });
          if (sets.length > 0) {
            const scoreLists: LearningIndicatorScore[][] = await Promise.all(
              sets.map((set) => loadLearningIndicatorScores({ schoolId, setId: set.id }))
            );
            let total = 0;
            let passed = 0;
            sets.forEach((set, idx) => {
              const scores = scoreLists[idx] || [];
              set.indicators.forEach((ind) => {
                total += 1;
                const matched = scores.find(
                  (sc) => sc.studentId === selectedStudent.id && sc.indicatorId === ind.id
                );
                if (matched?.result === 'pass') passed += 1;
              });
            });
            return [course.id, { passed, total, isReal: true }] as const;
          }

          // Baseline OBEC Units 1-3 estimate aligned with recorded grade when teacher has not yet logged indicators
          const fallbackSets = createObcUnitSetsForCourse({
            schoolId,
            course,
            academicYear,
            semester,
          });
          const g = grades.find(
            (row) => row.studentId === selectedStudent.id && row.courseId === course.id
          );
          const ratio = g ? Math.max(0, Math.min(1, g.totalScore / 100)) : 0.8;
          let total = 0;
          let passed = 0;
          fallbackSets.forEach((set) => {
            set.indicators.forEach((ind) => {
              total += 1;
              if (g && Math.round(ind.maxScore * ratio) >= ind.maxScore * 0.5) passed += 1;
            });
          });
          return [course.id, { passed, total, isReal: false }] as const;
        })
      );

      if (!active) return;
      const map: Record<string, { passed: number; total: number; isReal: boolean }> = {};
      results.forEach(([cid, stat]) => {
        map[cid] = stat;
      });
      setIndicatorByCourse(map);
    };

    void loadIndicators();
    return () => {
      active = false;
    };
  }, [academicYear, grades, schoolId, selectedStudent, semester, studentCourses]);

  // Grades & GPA calculations for the displayed courses + Overall GPAX
  const overallAcademicSummary = useMemo(() => {
    if (!selectedStudent) return null;
    return calculateStudentAcademicSummary({
      student: selectedStudent,
      courses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: academicYear,
      currentSemester: semester,
    });
  }, [academicYear, courses, grades, selectedStudent, semester, systemConfig.gradingSystem]);

  const coreCycleEntries = useMemo(() => {
    if (!selectedStudent) return [];
    return aggregateGradesByAssessmentCycle({
      student: selectedStudent,
      courses: studentCourses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: academicYear,
      currentSemester: semester,
    });
  }, [academicYear, grades, selectedStudent, semester, studentCourses, systemConfig.gradingSystem]);

  const coreGradeByCourseId = useMemo(
    () => new Map(coreCycleEntries.map((entry) => [entry.grade.courseId, entry])),
    [coreCycleEntries]
  );

  const reportRows = useMemo(() => {
    if (!selectedStudent) return [];
    return studentCourses.map((course) => {
      const area = resolveMoeLearningArea(course);
      const entry = coreGradeByCourseId.get(course.id);
      const grade =
        entry?.grade ||
        grades.find((g) => g.courseId === course.id && g.studentId === selectedStudent.id);
      const att = calculateDetailedCourseAttendance({
        student: selectedStudent,
        course,
        timetableSlots,
        attendance,
        periodAttendance,
      });
      const resolved =
        entry?.resolved ||
        resolveEffectiveGrade(grade, course, systemConfig.gradingSystem, att.isAtRiskMs);
      const indicatorStat = indicatorByCourse[course.id] || { passed: 0, total: 0, isReal: false };
      const formativeScore = grade
        ? grade.assignmentScore + grade.quizScore + grade.midtermScore
        : null;
      return {
        course,
        area,
        grade,
        att,
        resolved,
        indicatorStat,
        formativeScore,
      };
    });
  }, [
    attendance,
    coreGradeByCourseId,
    grades,
    indicatorByCourse,
    periodAttendance,
    selectedStudent,
    studentCourses,
    systemConfig.gradingSystem,
    timetableSlots,
  ]);

  const coreSummaryMetrics = useMemo(() => {
    let totalCredits = 0;
    let earnedCredits = 0;
    let weightedPoints = 0;
    let gradedCredits = 0;
    let rawScoreSum = 0;
    let gradedCount = 0;
    let attSum = 0;
    let totalIndPass = 0;
    let totalIndCount = 0;

    reportRows.forEach((r) => {
      totalIndPass += r.indicatorStat.passed;
      totalIndCount += r.indicatorStat.total;
      attSum += r.att.attendancePercent;
      if (!r.grade) return;
      gradedCount += 1;
      rawScoreSum += Number(r.grade.totalScore) || 0;
      const cr = Math.max(0, Number(r.course.credits) || 0);
      totalCredits += cr;
      if (r.resolved.passed) earnedCredits += cr;
      if (!r.resolved.isSpecial && cr > 0) {
        weightedPoints += r.resolved.point * cr;
        gradedCredits += cr;
      }
    });

    const coreGpa = gradedCredits > 0 ? weightedPoints / gradedCredits : 0;
    const avgRaw = gradedCount > 0 ? rawScoreSum / gradedCount : 0;
    const avgAttendance = reportRows.length > 0 ? attSum / reportRows.length : 100;
    return {
      totalCredits,
      earnedCredits,
      coreGpa,
      gradedCount,
      avgRaw,
      avgAttendance,
      totalIndPass,
      totalIndCount,
    };
  }, [reportRows]);

  // Data pulled from Student Quality Development Book (moeQualitativeStore, behaviorRecords, sdqAssessments)
  const studentQual = useMemo(() => {
    if (!selectedStudent) return createDefaultStudentQualitative('');
    return getStudentQualitativeRecord(qualitativeMap, selectedStudent.id);
  }, [qualitativeMap, selectedStudent]);

  const qualSummary = useMemo(() => summarizeStudentQualitative(studentQual), [studentQual]);

  const behaviorStats = useMemo(() => {
    if (!selectedStudent) return { merit: 0, demerit: 0, netScore: 100, count: 0 };
    const list = behaviorRecords.filter((b) => b.studentId === selectedStudent.id);
    const merit = list.filter((b) => b.type === 'merit').reduce((s, b) => s + Math.abs(b.points), 0);
    const demerit = list
      .filter((b) => b.type === 'demerit')
      .reduce((s, b) => s + Math.abs(b.points), 0);
    return {
      merit,
      demerit,
      netScore: Math.max(0, 100 + merit - demerit),
      count: list.length,
    };
  }, [behaviorRecords, selectedStudent]);

  const latestSdq = useMemo(() => {
    if (!selectedStudent) return null;
    return (
      sdqAssessments
        .filter((s) => s.studentId === selectedStudent.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0] || null
    );
  }, [sdqAssessments, selectedStudent]);

  const dailyAttendanceSummary = useMemo(() => {
    if (!selectedStudent) return { present: 0, late: 0, leave: 0, absent: 0, total: 0, pct: 100 };
    const logs = attendance.filter((a) => a.studentId === selectedStudent.id && a.userType !== 'teacher');
    if (logs.length === 0) {
      return {
        present: 0,
        late: 0,
        leave: 0,
        absent: 0,
        total: 0,
        pct: Number(coreSummaryMetrics.avgAttendance.toFixed(1)),
      };
    }
    const present = logs.filter((a) => a.status === 'present').length;
    const late = logs.filter((a) => a.status === 'late').length;
    const leave = logs.filter((a) => a.status === 'sick' || a.status === 'leave').length;
    const absent = logs.filter((a) => a.status === 'absent').length;
    const pct = Number((((present + late + leave) / logs.length) * 100).toFixed(1));
    return { present, late, leave, absent, total: logs.length, pct };
  }, [attendance, coreSummaryMetrics.avgAttendance, selectedStudent]);

  const handleResync = () => {
    setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
    setSyncNotice('ซิงค์ข้อมูลเกรด ตัวชี้วัด พฤติกรรม และความเห็นครูประจำชั้นจากสมุดบันทึกพัฒนาคุณภาพผู้เรียนเรียบร้อยแล้ว');
  };

  const handlePrintReportCard = () => {
    if (!printSheetRef.current || !selectedStudent) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `ReportCard_วิชาพื้นฐาน_ปพ5_ปพ6_${selectedStudent.studentIdNumber}`
    );
  };

  const handleDownloadPdf = () => {
    if (!selectedStudent) return;
    try {
      const { fileName } = downloadMoeGradeSummaryPdf({
        student: selectedStudent,
        courses: studentCourses,
        grades,
        systemConfig,
        school,
        advisorName,
        registrarName: measurementHeadName,
        principalName: directorName,
        readingRating: qualSummary.readingLabel,
        attributeRating: qualSummary.attrLabel,
        competencyRating: qualSummary.compLabel,
        activityResult: qualSummary.activityResult,
        homeroomRemark: studentQual.homeroomComment || '',
      });
      setSyncNotice(`ดาวน์โหลด PDF Report Card วิชาพื้นฐาน (${fileName}) สำเร็จ`);
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : 'ไม่สามารถสร้างไฟล์ PDF ได้');
    }
  };

  if (!selectedStudent) {
    return (
      <div className="p-8 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-text-muted)]">
        ไม่พบข้อมูลนักเรียนสำหรับจัดทำ Report Card วิชาพื้นฐาน
      </div>
    );
  }

  const hideGpa = Boolean(overallAcademicSummary?.hideGpaCalculations);
  const isPrimary = Boolean(overallAcademicSummary?.isPrimary);
  const overallFeedback = getRawScoreFeedback(
    coreSummaryMetrics.gradedCount > 0 ? Math.round(coreSummaryMetrics.avgRaw) : null
  );
  const issuedDateTh = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-3">
      {/* Control Toolbar */}
      <div className="saas-card p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative min-w-48 flex-1 sm:flex-initial sm:w-56">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ รหัส เลข ปชช. ห้อง..."
              className="w-full pl-8 pr-6 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            aria-label="กรองห้องเรียน"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
          >
            <option value="all">ทุกห้องเรียน</option>
            {roomOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            aria-label="เลือกนักเรียน"
            value={selectedStudent.id}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="min-w-56 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
          >
            {filteredStudents.length === 0 ? (
              <option value={selectedStudent.id}>ไม่พบนักเรียน</option>
            ) : (
              filteredStudents.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.studentIdNumber} · {stu.firstNameTh} {stu.lastNameTh} ({stu.room})
                </option>
              ))
            )}
          </select>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={currentIdx <= 0}
              onClick={() => {
                if (currentIdx > 0) setSelectedStudentId(filteredStudents[currentIdx - 1].id);
              }}
              className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold disabled:opacity-40 cursor-pointer inline-flex items-center gap-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ก่อนหน้า</span>
            </button>
            <button
              type="button"
              disabled={currentIdx < 0 || currentIdx >= filteredStudents.length - 1}
              onClick={() => {
                if (currentIdx >= 0 && currentIdx < filteredStudents.length - 1) {
                  setSelectedStudentId(filteredStudents[currentIdx + 1].id);
                }
              }}
              className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold disabled:opacity-40 cursor-pointer inline-flex items-center gap-0.5"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCoreOnly((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
              coreOnly
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)]'
            }`}
          >
            {coreOnly ? 'เฉพาะวิชาพื้นฐาน (ปพ.5/6)' : 'รวมวิชาเพิ่มเติม'}
          </button>

          {onOpenStudentDevBook && (
            <button
              type="button"
              onClick={() => onOpenStudentDevBook(selectedStudent.id)}
              className="btn-tool-tone px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 tone-text" />
              <span>แก้ไขในสมุดพัฒนาฯ</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResync}
            className="btn-tool-neutral px-2.5 py-1.5 text-xs whitespace-nowrap"
            title="ซิงค์ข้อมูลล่าสุดจากสมุดบันทึกพัฒนาคุณภาพผู้เรียน"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ซิงค์ข้อมูล</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSignatoriesPanel((prev) => !prev)}
            className="btn-tool-neutral px-2.5 py-1.5 text-xs whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ผู้ลงนาม</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="btn-tool-neutral px-2.5 py-1.5 text-xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF ศธ.</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReportCard}
            className="btn-action-primary px-3 py-1.5 text-xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ Report Card (A4)</span>
          </button>
        </div>
      </div>

      {showSignatoriesPanel && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs print:hidden">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
              ชื่อครูประจำชั้น / ครูที่ปรึกษา
            </label>
            <input
              type="text"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
              placeholder="เช่น นางสาวสมหญิง ใจดี"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
              หัวหน้างานวัดและประเมินผล / นายทะเบียน
            </label>
            <input
              type="text"
              value={measurementHeadName}
              onChange={(e) => setMeasurementHeadName(e.target.value)}
              placeholder="เช่น นายสมชาย รักเรียน"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[var(--color-text-title)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
              ผู้อำนวยการสถานศึกษา
            </label>
            <input
              type="text"
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              placeholder="เช่น ดร.สุรชัย พัฒนากูล"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[var(--color-text-title)]"
            />
          </div>
        </div>
      )}

      {syncNotice && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 print:hidden">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncNotice}</span>
          </span>
          <button type="button" onClick={() => setSyncNotice(null)} className="underline cursor-pointer">
            ปิด
          </button>
        </div>
      )}

      {/* Official OBEC Report Card Document (A4 Crisp White Formal Form matching ปพ.5 & ปพ.6) */}
      <div
        ref={printSheetRef}
        className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-300 space-y-5 print:m-0 print:p-0 print:border-none print:shadow-none"
      >
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            {school?.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={schoolNameTh}
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
                แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายวิชาพื้นฐาน (อิงแบบ ปพ.๕ และ ปพ.๖ สพฐ.)
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-950">
                โรงเรียน{schoolNameTh}
              </h2>
              <p className="text-[11px] text-slate-600">
                สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.) ·{' '}
                {isPrimary
                  ? `ประเมินผลรายปี ปีการศึกษา ${academicYear}`
                  : `${formatSemesterLabel(semester)} ปีการศึกษา ${academicYear}`}{' '}
                · {getEducationStageLabelTh(overallAcademicSummary?.stage || 'lower_secondary')}
              </p>
            </div>

            <div className="border-2 border-slate-900 px-3 py-1.5 text-center shrink-0">
              <div className="text-xs font-extrabold">ปพ.๕ / ปพ.๖</div>
              <div className="text-[10px] font-mono">วิชาพื้นฐาน</div>
            </div>
          </div>

          {/* Student Bio Grid */}
          <table className="w-full text-xs border-collapse border border-slate-700">
            <tbody>
              <tr>
                <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold w-32">
                  ชื่อ - สกุล ผู้เรียน
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 font-bold text-slate-950">
                  {getStudentShortPrefixTh(selectedStudent)} {selectedStudent.firstNameTh}{' '}
                  {selectedStudent.lastNameTh}
                  <span className="ml-2 text-slate-600 font-normal">
                    ({selectedStudent.firstNameEn} {selectedStudent.lastNameEn})
                  </span>
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold w-28">
                  เลขประจำตัว
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 font-mono font-bold tabular-nums">
                  {selectedStudent.studentIdNumber}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold">
                  เลขประชาชน (๑๓ หลัก)
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 font-mono tabular-nums">
                  {selectedStudent.nationalId || '—'}
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold">
                  ระดับชั้น / ห้อง
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 font-semibold">
                  {selectedStudent.gradeLevel} ({selectedStudent.room})
                </td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold">
                  แผนการเรียน / วันเกิด
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5">
                  {selectedStudent.academicTrack || 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน'} ·{' '}
                  <span className="tabular-nums">{selectedStudent.dateOfBirth || '—'}</span>
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold">
                  ผู้ปกครอง
                </td>
                <td className="border border-slate-500 px-2.5 py-1.5">
                  {selectedStudent.guardianName} ({selectedStudent.guardianRelation})
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 1: Core Subjects Table (Combining ปพ.5 scores + indicators + attendance into ปพ.6 Report Card) */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1">
            <h3 className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>
                ตอนที่ ๑ ผลการเรียนรายวิชาพื้นฐาน ๘ กลุ่มสาระการเรียนรู้ (ข้อมูลจาก ปพ.๕ และสมุดบันทึกพัฒนาคุณภาพผู้เรียน)
              </span>
            </h3>
            <span className="text-[11px] font-mono text-slate-600 tabular-nums">
              {reportRows.length} รายวิชา · ผ่านตัวชี้วัด {coreSummaryMetrics.totalIndPass}/
              {coreSummaryMetrics.totalIndCount}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-slate-700 text-center tabular-nums">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <th className="border border-slate-600 py-2 px-1.5 w-8">ที่</th>
                  <th className="border border-slate-600 py-2 px-2 w-20">รหัสวิชา</th>
                  <th className="border border-slate-600 py-2 px-2.5 text-left">
                    รายวิชาพื้นฐาน / กลุ่มสาระฯ
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-14">
                    {isPrimary ? 'น้ำหนัก' : 'นก.'}
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-20">
                    เวลาเรียน (ปพ.๕)
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-20">
                    ตัวชี้วัด (ผ่าน)
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-16">
                    ระหว่างภาค
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-14">
                    ปลายภาค
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-16 bg-amber-50">
                    รวม (%)
                  </th>
                  <th className="border border-slate-600 py-2 px-1.5 w-16 bg-slate-200">
                    เกรด
                  </th>
                  <th className="border border-slate-600 py-2 px-2 w-28">
                    ผลการประเมิน
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-slate-500 border border-slate-400">
                      ยังไม่มีรายวิชาพื้นฐานหรือผลการเรียนของนักเรียนคนนี้ในรอบการประเมินปัจจุบัน
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row, index) => {
                    const rawFeedback = row.grade ? getRawScoreFeedback(row.grade.totalScore) : null;
                    const isRisk =
                      row.att.isAtRiskMs ||
                      row.resolved.letter === '0' ||
                      row.resolved.letter === 'ร' ||
                      row.resolved.letter === 'มส.' ||
                      row.resolved.letter === 'มผ' ||
                      (row.grade ? row.grade.totalScore < 50 : false);
                    return (
                      <tr key={row.course.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 py-1.5 font-mono">{index + 1}</td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold text-slate-900">
                          {row.course.code}
                        </td>
                        <td className="border border-slate-400 py-1.5 px-2.5 text-left">
                          <div className="font-semibold text-slate-900">{row.course.titleTh}</div>
                          <div className="text-[10px] text-slate-500">
                            {row.area.shortTh} · ครูผู้สอน: {row.course.teacherName || '—'}
                          </div>
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.course.credits > 0 ? row.course.credits.toFixed(1) : '-'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          <span className={row.att.isAtRiskMs ? 'font-bold text-rose-700' : 'text-slate-800'}>
                            {row.att.attendancePercent}%
                          </span>
                          <span className="block text-[9px] text-slate-500">
                            {row.att.attendedHours}/{row.att.totalScheduledHours} ชม.
                          </span>
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          <span className="font-semibold">
                            {row.indicatorStat.passed}/{row.indicatorStat.total}
                          </span>
                          <span className="block text-[9px] text-slate-500">
                            {row.indicatorStat.isReal ? 'ผลจริง' : 'เกณฑ์ สพฐ.'}
                          </span>
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.formativeScore !== null ? row.formativeScore : '—'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono">
                          {row.grade ? row.grade.finalScore : '—'}
                        </td>
                        <td className="border border-slate-400 py-1.5 font-mono font-bold bg-amber-50">
                          {row.grade ? `${row.grade.totalScore}%` : '—'}
                        </td>
                        <td
                          className={`border border-slate-400 py-1.5 font-mono font-extrabold ${
                            isRisk ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-950'
                          }`}
                        >
                          {row.grade ? row.resolved.letter : '—'}
                        </td>
                        <td className="border border-slate-400 py-1.5 px-1.5">
                          {!row.grade ? (
                            <span className="text-slate-400">รอผลคะแนน</span>
                          ) : isRisk ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{row.att.isAtRiskMs ? 'มส. (<80%)' : 'ควรซ่อมเสริม'}</span>
                            </span>
                          ) : isPrimary && rawFeedback ? (
                            <span className="font-semibold text-emerald-800">{rawFeedback.labelTh}</span>
                          ) : (
                            <span className="font-semibold text-emerald-800">
                              {row.resolved.point >= 3.5
                                ? 'ดีเยี่ยม'
                                : row.resolved.point >= 2.5
                                ? 'ดี'
                                : 'ผ่านเกณฑ์'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-700">
                  {hideGpa ? (
                    <>
                      <td colSpan={6} className="border border-slate-600 py-2 px-3 text-left">
                        สรุปผลวิชาพื้นฐานรายปี ({coreSummaryMetrics.gradedCount} วิชา · เวลาเรียนเฉลี่ย{' '}
                        {coreSummaryMetrics.avgAttendance.toFixed(1)}%)
                      </td>
                      <td colSpan={3} className="border border-slate-600 py-2 px-2 text-right font-mono">
                        คะแนนเฉลี่ย: {coreSummaryMetrics.gradedCount > 0 ? `${coreSummaryMetrics.avgRaw.toFixed(1)}%` : '—'}
                      </td>
                      <td colSpan={2} className="border border-slate-600 py-2 px-2 text-center text-emerald-900">
                        {overallFeedback.labelTh}
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={3} className="border border-slate-600 py-2 px-3 text-left">
                        สรุปผลวิชาพื้นฐาน ({coreSummaryMetrics.gradedCount} รายวิชา)
                      </td>
                      <td className="border border-slate-600 py-2 font-mono">
                        {coreSummaryMetrics.totalCredits.toFixed(1)}
                      </td>
                      <td colSpan={2} className="border border-slate-600 py-2 font-mono">
                        ได้ {coreSummaryMetrics.earnedCredits.toFixed(1)} นก.
                      </td>
                      <td colSpan={2} className="border border-slate-600 py-2 font-mono text-right px-2">
                        เฉลี่ย {coreSummaryMetrics.avgRaw.toFixed(1)}%
                      </td>
                      <td colSpan={3} className="border border-slate-600 py-2 px-2 text-center font-mono">
                        GPA พื้นฐาน: {coreSummaryMetrics.coreGpa.toFixed(2)} | GPAX รวม:{' '}
                        {overallAcademicSummary?.gpax !== null && overallAcademicSummary?.gpax !== undefined
                          ? overallAcademicSummary.gpax.toFixed(2)
                          : coreSummaryMetrics.coreGpa.toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: Synced Qualitative Assessments (Attributes 8 + Reading/Writing 5 + Competencies + Activities) */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="text-xs font-extrabold text-slate-950 border-b border-slate-300 pb-1">
            ตอนที่ ๒ ผลการประเมินคุณลักษณะอันพึงประสงค์ การอ่าน คิดวิเคราะห์ เขียน สมรรถนะ และกิจกรรม (จากสมุดบันทึกพัฒนาคุณภาพผู้เรียน)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 8 Attributes */}
            <table className="w-full text-[11px] border-collapse border border-slate-700">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <th className="border border-slate-600 px-2.5 py-1.5 text-left">
                    คุณลักษณะอันพึงประสงค์ ๘ ประการ
                  </th>
                  <th className="border border-slate-600 px-2 py-1.5 text-center w-28">ผลการประเมิน</th>
                </tr>
              </thead>
              <tbody>
                {MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((attr, idx) => {
                  const val = studentQual.attributes[idx] ?? 3;
                  return (
                    <tr key={attr.index}>
                      <td className="border border-slate-400 px-2.5 py-1">{attr.titleTh}</td>
                      <td
                        className={`border border-slate-400 px-2 py-1 text-center font-semibold ${
                          val === 0 ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        {QUALITY_TEXT[val] || 'ดีเยี่ยม (๓)'}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-600 px-2.5 py-1.5">สรุปผลการประเมินคุณลักษณะฯ</td>
                  <td className="border border-slate-600 px-2 py-1.5 text-center text-emerald-900">
                    {qualSummary.attrLabel}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 5 Reading/Writing + Competencies + Activities */}
            <div className="space-y-3">
              <table className="w-full text-[11px] border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <th className="border border-slate-600 px-2.5 py-1.5 text-left">
                      การอ่าน คิดวิเคราะห์ และเขียน (๕ มิติ)
                    </th>
                    <th className="border border-slate-600 px-2 py-1.5 text-center w-28">
                      ผลการประเมิน
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MOE_READING_WRITING_RUBRIC.map((dim, idx) => {
                    const val = studentQual.readingWriting[idx] ?? 3;
                    return (
                      <tr key={dim.index}>
                        <td className="border border-slate-400 px-2.5 py-1">{dim.titleTh}</td>
                        <td
                          className={`border border-slate-400 px-2 py-1 text-center font-semibold ${
                            val === 0 ? 'text-rose-700' : 'text-indigo-800'
                          }`}
                        >
                          {QUALITY_TEXT[val] || 'ดีเยี่ยม (๓)'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-600 px-2.5 py-1.5">
                      สรุปผล ({qualSummary.readingPercent}%)
                    </td>
                    <td className="border border-slate-600 px-2 py-1.5 text-center text-indigo-900">
                      {qualSummary.readingLabel}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full text-[11px] border-collapse border border-slate-700">
                <tbody>
                  <tr>
                    <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold w-48">
                      สมรรถนะสำคัญของผู้เรียน ๕ ด้าน
                    </td>
                    <td className="border border-slate-500 px-2.5 py-1.5 font-semibold text-emerald-900">
                      {qualSummary.compLabel} ({MOE_KEY_COMPETENCIES.length} ด้าน)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-500 px-2.5 py-1.5 bg-slate-100 font-bold">
                      กิจกรรมพัฒนาผู้เรียน (๔ กิจกรรม)
                    </td>
                    <td className="border border-slate-500 px-2.5 py-1.5 font-semibold text-emerald-900">
                      {qualSummary.activityResult} (
                      {MOE_STUDENT_ACTIVITIES.map((a, idx) => `${a.name.split(' ')[0]} ${studentQual.activities[idx] || 'ผ'}`).join(' · ')}
                      )
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 3: Attendance, Behavior/SDQ & Homeroom Comment */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="text-xs font-extrabold text-slate-950 border-b border-slate-300 pb-1">
            ตอนที่ ๓ สรุปสถิติเวลาเรียน พฤติกรรม และข้อเสนอแนะครูประจำชั้น (จากสมุดบันทึกพัฒนาคุณภาพผู้เรียน)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] tabular-nums">
            <div className="border border-slate-500 rounded-lg p-2.5 bg-slate-50 space-y-1">
              <div className="font-bold text-slate-900">สถิติเวลาเรียนรวม</div>
              <div className="font-mono font-extrabold text-sm text-sky-900">
                เข้าเรียน {dailyAttendanceSummary.pct}%
              </div>
              <div className="text-slate-600">
                {dailyAttendanceSummary.total > 0
                  ? `มา ${dailyAttendanceSummary.present} · สาย ${dailyAttendanceSummary.late} · ลา ${dailyAttendanceSummary.leave} · ขาด ${dailyAttendanceSummary.absent}`
                  : `เฉลี่ยรายวิชา ${coreSummaryMetrics.avgAttendance.toFixed(1)}% (เกณฑ์สิทธิ์สอบ ≥ 80%)`}
              </div>
            </div>

            <div className="border border-slate-500 rounded-lg p-2.5 bg-slate-50 space-y-1">
              <div className="font-bold text-slate-900">คะแนนความประพฤติ &amp; SDQ</div>
              <div className="font-mono font-extrabold text-sm text-emerald-900">
                {behaviorStats.netScore} คะแนน (ดี +{behaviorStats.merit} / หัก -{behaviorStats.demerit})
              </div>
              <div className="text-slate-600">
                ผลคัดกรอง SDQ:{' '}
                {latestSdq
                  ? latestSdq.overallStatus === 'normal'
                    ? 'ปกติ'
                    : latestSdq.overallStatus === 'risk'
                    ? 'กลุ่มเสี่ยง'
                    : 'มีปัญหา'
                  : 'ยังไม่มีผลคัดกรองในรอบนี้'}
              </div>
            </div>

            <div className="border border-slate-500 rounded-lg p-2.5 bg-slate-50 space-y-1">
              <div className="font-bold text-slate-900">ความก้าวหน้าตัวชี้วัดวิชาพื้นฐาน</div>
              <div className="font-mono font-extrabold text-sm text-indigo-900">
                ผ่าน {coreSummaryMetrics.totalIndPass}/{coreSummaryMetrics.totalIndCount} ตัวชี้วัด
              </div>
              <div className="text-slate-600">
                วันที่ออกเอกสาร: {issuedDateTh}
              </div>
            </div>
          </div>

          <div className="border border-slate-500 rounded-lg p-3 text-xs bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-900">ความเห็นและข้อเสนอแนะของครูประจำชั้น:</div>
            <p className="text-slate-800 leading-relaxed">
              {studentQual.homeroomComment?.trim() ||
                'นักเรียนมีความตั้งใจเรียนและมีพัฒนาการเหมาะสมตามเกณฑ์มาตรฐานของสถานศึกษา ควรส่งเสริมการอ่านและทบทวนบทเรียนอย่างต่อเนื่อง'}
            </p>
          </div>
        </div>

        {/* Section 4: Official 4-Party Signatories (Aligned with ปพ.6) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-700 divide-y lg:divide-y-0 lg:divide-x divide-slate-700 text-[11px] text-center break-inside-avoid">
          <div className="p-3 space-y-6">
            <p className="font-bold text-slate-900">ครูประจำชั้น / ครูที่ปรึกษา</p>
            <div>
              <div className="border-b border-dotted border-slate-500 mx-3 mb-1" />
              <p className="font-semibold">({advisorName.trim() || '........................................'})</p>
              <p className="text-[10px] text-slate-600">วันที่ ....... / ............ / ...........</p>
            </div>
          </div>

          <div className="p-3 space-y-6">
            <p className="font-bold text-slate-900">ผู้ปกครองรับทราบ</p>
            <div>
              <div className="border-b border-dotted border-slate-500 mx-3 mb-1" />
              <p className="font-semibold">({selectedStudent.guardianName || '........................................'})</p>
              <p className="text-[10px] text-slate-600">วันที่ ....... / ............ / ...........</p>
            </div>
          </div>

          <div className="p-3 space-y-6">
            <p className="font-bold text-slate-900">หัวหน้างานวัดและประเมินผล</p>
            <div>
              <div className="border-b border-dotted border-slate-500 mx-3 mb-1" />
              <p className="font-semibold">({measurementHeadName.trim() || '........................................'})</p>
              <p className="text-[10px] text-slate-600">วันที่ ....... / ............ / ...........</p>
            </div>
          </div>

          <div className="p-3 space-y-6 bg-slate-50">
            <p className="font-bold text-slate-950">ผู้อำนวยการสถานศึกษา</p>
            <div>
              <div className="border-b border-dotted border-slate-500 mx-3 mb-1" />
              <p className="font-semibold">({directorName.trim() || '........................................'})</p>
              <p className="text-[10px] text-slate-600">วันที่ ....... / ............ / ...........</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
