import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  HeartHandshake,
  HeartPulse,
  ListChecks,
  Plus,
  Printer,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  Course,
  GradeRecord,
  HomeworkSubmission,
  InfirmaryVisit,
  LearningIndicatorScore,
  LearningIndicatorSet,
  PeriodAttendanceRecord,
  School,
  SdqAssessment,
  Student,
  SystemConfig,
  TimetableSlot,
  UserRole,
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
  loadLearningIndicatorScores,
  loadLearningIndicatorSets,
} from '../lib/learningIndicatorStore';
import {
  calculateDetailedCourseAttendance,
  createDefaultStudentQualitative,
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  saveQualitativeAssessments,
  StudentQualitativeAssessment,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentShortPrefixTh,
} from '../lib/moeGrading';
import { getLocalDateString } from '../lib/date';
import { formatSemesterLabel } from '../lib/schoolSettings';
import { getModuleGroupMeta, getModuleTone } from '../lib/moduleTheme';
import { printHtmlElementInIsolatedFrame } from '../lib/moeReportPdf';
import { useSchoolCustomPresets } from '../lib/schoolCustomPresets';

interface StudentQualityDevelopmentBookViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  behaviorRecords: BehaviorRecord[];
  sdqAssessments: SdqAssessment[];
  infirmaryVisits?: InfirmaryVisit[];
  homeworkSubmissions?: HomeworkSubmission[];
  systemConfig: SystemConfig;
  school?: School;
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  initialStudentId?: string;
  onAddBehaviorRecord?: (record: BehaviorRecord) => void;
  onOpenReportCard?: (student: Student) => void;
  onOpenCoreReportCard?: (studentId: string) => void;
  onOpenQualitativeSummary?: () => void;
  onOpenCourseIndicators?: (courseId: string) => void;
  onOpenBehaviorSdq?: () => void;
  lang?: AppLanguage;
}

interface StudentCourseIndicatorSummary {
  course: Course;
  areaNameTh: string;
  areaShortTh: string;
  isRecordedReal: boolean;
  totalIndicators: number;
  passedIndicators: number;
  failedIndicators: number;
  items: Array<{
    id: string;
    code: string;
    title: string;
    unitTitle: string;
    score: number;
    maxScore: number;
    result: 'pass' | 'not_pass' | 'pending';
    evidence?: string;
  }>;
}

export const StudentQualityDevelopmentBookView: React.FC<StudentQualityDevelopmentBookViewProps> = ({
  students,
  courses,
  grades,
  attendance,
  periodAttendance = [],
  timetableSlots = [],
  behaviorRecords,
  sdqAssessments,
  infirmaryVisits = [],
  homeworkSubmissions = [],
  systemConfig,
  school,
  currentRole = 'teacher',
  currentUser,
  initialStudentId,
  onAddBehaviorRecord,
  onOpenReportCard,
  onOpenCoreReportCard,
  onOpenQualitativeSummary,
  onOpenCourseIndicators,
  onOpenBehaviorSdq,
  lang = 'th',
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';
  const { presets } = useSchoolCustomPresets(schoolId);

  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState<string>(() => {
    if (currentRole === 'teacher' && currentUser?.homeroomClass) {
      return currentUser.homeroomClass;
    }
    return 'all';
  });
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'attention'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || ''
  );
  const [indicatorViewFilter, setIndicatorViewFilter] = useState<'all' | 'needs_support'>('all');
  const [indicatorDataByCourse, setIndicatorDataByCourse] = useState<
    Record<string, { sets: LearningIndicatorSet[]; scoresBySetId: Record<string, LearningIndicatorScore[]> }>
  >({});
  const [loadingIndicators, setLoadingIndicators] = useState(false);

  const [qualitativeMap, setQualitativeMap] = useState<Record<string, StudentQualitativeAssessment>>(() =>
    loadQualitativeAssessments(schoolId, academicYear, semester)
  );
  const [showQualEditor, setShowQualEditor] = useState(false);

  // Quick Behavior Log Form State
  const [showQuickBehaviorForm, setShowQuickBehaviorForm] = useState(false);
  const [quickBehType, setQuickBehType] = useState<'merit' | 'demerit'>('merit');
  const [quickBehCategory, setQuickBehCategory] = useState(
    presets.behaviorMeritPresets[0]?.label || 'ช่วยเหลือเพื่อน/จิตอาสา'
  );
  const [quickBehPoints, setQuickBehPoints] = useState(
    presets.behaviorMeritPresets[0]?.points || 5
  );
  const [quickBehNotes, setQuickBehNotes] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

  useEffect(() => {
    if (roomFilter !== 'all' && !roomOptions.includes(roomFilter)) {
      setRoomFilter('all');
    }
  }, [roomFilter, roomOptions]);

  // Quick risk/attention evaluator across all students for homeroom triage
  const studentRiskLookup = useMemo(() => {
    const map = new Map<string, { needsAttention: boolean; reasons: string[] }>();
    students.forEach((stu) => {
      const reasons: string[] = [];
      const sum = calculateStudentAcademicSummary({
        student: stu,
        courses,
        grades,
        gradingSystem: systemConfig.gradingSystem,
        currentAcademicYear: academicYear,
        currentSemester: semester,
      });
      if (!sum.hideGpaCalculations && sum.hasRecordedGrades && (sum.gpax ?? 4) < 2.25) {
        reasons.push('เกรดเฉลี่ย < 2.25');
      } else if (sum.hideGpaCalculations && sum.averageRawScore !== null && sum.averageRawScore < 60) {
        reasons.push('คะแนนเฉลี่ย < 60%');
      }

      const stuGrades = grades.filter((g) => g.studentId === stu.id);
      if (stuGrades.some((g) => ['0', 'F', 'ร', 'มส.', 'มผ'].includes(g.letterGrade) || g.totalScore < 50)) {
        reasons.push('มีวิชาต่ำกว่าเกณฑ์/ร/มส.');
      }

      const stuSdq = sdqAssessments.find((item) => item.studentId === stu.id);
      if (stuSdq && (stuSdq.overallStatus === 'risk' || stuSdq.overallStatus === 'problem')) {
        reasons.push(stuSdq.overallStatus === 'problem' ? 'SDQ มีปัญหา' : 'SDQ กลุ่มเสี่ยง');
      }

      const stuAtt = attendance.filter((a) => a.studentId === stu.id && a.userType !== 'teacher');
      if (stuAtt.length > 0) {
        const present = stuAtt.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'leave' || a.status === 'sick').length;
        if ((present / stuAtt.length) * 100 < 80) {
          reasons.push('เวลาเรียน < 80%');
        }
      }

      const netBehavior =
        100 +
        behaviorRecords
          .filter((b) => b.studentId === stu.id)
          .reduce((acc, b) => acc + (b.type === 'merit' ? Math.abs(b.points) : -Math.abs(b.points)), 0);
      if (netBehavior < 85) {
        reasons.push('คะแนนพฤติกรรม < 85');
      }

      map.set(stu.id, { needsAttention: reasons.length > 0, reasons });
    });
    return map;
  }, [academicYear, attendance, behaviorRecords, courses, grades, sdqAssessments, semester, students, systemConfig.gradingSystem]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      if (roomFilter !== 'all' && s.room !== roomFilter) return false;
      if (priorityFilter === 'attention' && !studentRiskLookup.get(s.id)?.needsAttention) return false;
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
  }, [priorityFilter, roomFilter, searchTerm, studentRiskLookup, students]);

  const selectedStudent =
    filteredStudents.find((s) => s.id === selectedStudentId) ||
    students.find((s) => s.id === selectedStudentId) ||
    filteredStudents[0] ||
    students[0];

  const currentIdx = selectedStudent
    ? filteredStudents.findIndex((s) => s.id === selectedStudent.id)
    : -1;

  // Determine student courses
  const studentCourses = useMemo(() => {
    if (!selectedStudent) return [];
    const matched = courses.filter(
      (c) =>
        (c.enrolledStudentIds || []).includes(selectedStudent.id) ||
        grades.some((g) => g.courseId === c.id && g.studentId === selectedStudent.id)
    );
    return matched.length > 0 ? matched : courses;
  }, [courses, grades, selectedStudent]);

  // Load Learning Indicator sets & scores across all courses of selected student
  useEffect(() => {
    let active = true;
    if (!selectedStudent || studentCourses.length === 0) {
      setIndicatorDataByCourse({});
      return;
    }

    const loadAll = async () => {
      setLoadingIndicators(true);
      try {
        const entries = await Promise.all(
          studentCourses.map(async (course) => {
            const sets = await loadLearningIndicatorSets({
              schoolId,
              courseId: course.id,
              academicYear,
              semester,
            });
            const scoresBySetId: Record<string, LearningIndicatorScore[]> = {};
            await Promise.all(
              sets.map(async (set) => {
                scoresBySetId[set.id] = await loadLearningIndicatorScores({
                  schoolId,
                  setId: set.id,
                });
              })
            );
            return [course.id, { sets, scoresBySetId }] as const;
          })
        );
        if (!active) return;
        const nextMap: Record<
          string,
          { sets: LearningIndicatorSet[]; scoresBySetId: Record<string, LearningIndicatorScore[]> }
        > = {};
        entries.forEach(([courseId, data]) => {
          nextMap[courseId] = data;
        });
        setIndicatorDataByCourse(nextMap);
      } finally {
        if (active) setLoadingIndicators(false);
      }
    };

    void loadAll();
    return () => {
      active = false;
    };
  }, [academicYear, schoolId, selectedStudent, semester, studentCourses]);

  // Academic Summary & Course Grades
  const academicSummary = useMemo(() => {
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

  const cycleGradeEntries = useMemo(() => {
    if (!selectedStudent) return [];
    return aggregateGradesByAssessmentCycle({
      student: selectedStudent,
      courses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
      currentAcademicYear: academicYear,
      currentSemester: semester,
    });
  }, [academicYear, courses, grades, selectedStudent, semester, systemConfig.gradingSystem]);

  // Overall Attendance Breakdown for Selected Student
  const studentAttendanceSummary = useMemo(() => {
    if (!selectedStudent) {
      return {
        presentCount: 0,
        lateCount: 0,
        sickCount: 0,
        leaveCount: 0,
        absentCount: 0,
        totalRecords: 0,
        attendancePercent: 100,
        isAtRiskMs: false,
      };
    }
    const dailyLogs = attendance.filter(
      (a) => a.studentId === selectedStudent.id && a.userType !== 'teacher'
    );
    if (dailyLogs.length > 0) {
      const presentCount = dailyLogs.filter((a) => a.status === 'present').length;
      const lateCount = dailyLogs.filter((a) => a.status === 'late').length;
      const sickCount = dailyLogs.filter((a) => a.status === 'sick').length;
      const leaveCount = dailyLogs.filter((a) => a.status === 'leave').length;
      const absentCount = dailyLogs.filter((a) => a.status === 'absent').length;
      const attended = presentCount + lateCount + sickCount + leaveCount;
      const pct = Math.round((attended / dailyLogs.length) * 1000) / 10;
      return {
        presentCount,
        lateCount,
        sickCount,
        leaveCount,
        absentCount,
        totalRecords: dailyLogs.length,
        attendancePercent: pct,
        isAtRiskMs: pct < 80,
      };
    }

    const courseAttList = studentCourses.map((c) =>
      calculateDetailedCourseAttendance({
        student: selectedStudent,
        course: c,
        timetableSlots,
        attendance,
        periodAttendance,
      })
    );
    const avgPct =
      courseAttList.length > 0
        ? Math.round(
            (courseAttList.reduce((s, a) => s + a.attendancePercent, 0) / courseAttList.length) * 10
          ) / 10
        : 95;
    return {
      presentCount: 0,
      lateCount: 0,
      sickCount: 0,
      leaveCount: 0,
      absentCount: 0,
      totalRecords: 0,
      attendancePercent: avgPct,
      isAtRiskMs: avgPct < 80,
    };
  }, [attendance, periodAttendance, selectedStudent, studentCourses, timetableSlots]);

  // Consolidated Learning Indicators across Student's Courses
  const indicatorSummaries = useMemo<{
    byCourse: StudentCourseIndicatorSummary[];
    totalIndicators: number;
    passedIndicators: number;
    failedIndicators: number;
    recordedRealCourses: number;
  }>(() => {
    if (!selectedStudent) {
      return {
        byCourse: [],
        totalIndicators: 0,
        passedIndicators: 0,
        failedIndicators: 0,
        recordedRealCourses: 0,
      };
    }

    let totalIndicators = 0;
    let passedIndicators = 0;
    let failedIndicators = 0;
    let recordedRealCourses = 0;

    const byCourse: StudentCourseIndicatorSummary[] = studentCourses.map((course) => {
      const area = resolveMoeLearningArea(course);
      const stored = indicatorDataByCourse[course.id];
      const courseGrade = grades.find(
        (g) => g.studentId === selectedStudent.id && g.courseId === course.id
      );

      if (stored && stored.sets.length > 0) {
        recordedRealCourses += 1;
        const items: StudentCourseIndicatorSummary['items'] = [];
        let cPass = 0;
        let cFail = 0;

        stored.sets.forEach((set) => {
          const scoreRows = stored.scoresBySetId[set.id] || [];
          set.indicators.forEach((ind) => {
            const matchedScore = scoreRows.find(
              (sc) => sc.studentId === selectedStudent.id && sc.indicatorId === ind.id
            );
            const result: 'pass' | 'not_pass' | 'pending' = matchedScore
              ? matchedScore.result
              : 'pending';
            if (result === 'pass') cPass += 1;
            else if (result === 'not_pass') cFail += 1;

            items.push({
              id: ind.id,
              code: ind.code,
              title: ind.title,
              unitTitle: set.unitTitle || set.title,
              score: matchedScore ? matchedScore.score : 0,
              maxScore: ind.maxScore,
              result,
              evidence: matchedScore?.evidence,
            });
          });
        });

        totalIndicators += items.length;
        passedIndicators += cPass;
        failedIndicators += cFail;

        return {
          course,
          areaNameTh: area.nameTh,
          areaShortTh: area.shortTh,
          isRecordedReal: true,
          totalIndicators: items.length,
          passedIndicators: cPass,
          failedIndicators: cFail,
          items,
        };
      }

      // Baseline OBEC Units 1-3 indicators aligned with course learning area
      const fallbackSets = createObcUnitSetsForCourse({
        schoolId,
        course,
        academicYear,
        semester,
      });
      const ratio = courseGrade ? Math.max(0, Math.min(1, courseGrade.totalScore / 100)) : 0.78;
      const items: StudentCourseIndicatorSummary['items'] = [];
      let cPass = 0;
      let cFail = 0;

      fallbackSets.forEach((set) => {
        set.indicators.forEach((ind) => {
          const estScore = Math.round(ind.maxScore * ratio);
          const result: 'pass' | 'not_pass' | 'pending' = courseGrade
            ? estScore >= ind.maxScore * 0.5
              ? 'pass'
              : 'not_pass'
            : 'pending';
          if (result === 'pass') cPass += 1;
          else if (result === 'not_pass') cFail += 1;
          items.push({
            id: ind.id,
            code: ind.code,
            title: ind.title,
            unitTitle: set.unitTitle || set.title,
            score: estScore,
            maxScore: ind.maxScore,
            result,
          });
        });
      });

      totalIndicators += items.length;
      passedIndicators += cPass;
      failedIndicators += cFail;

      return {
        course,
        areaNameTh: area.nameTh,
        areaShortTh: area.shortTh,
        isRecordedReal: false,
        totalIndicators: items.length,
        passedIndicators: cPass,
        failedIndicators: cFail,
        items,
      };
    });

    return {
      byCourse,
      totalIndicators,
      passedIndicators,
      failedIndicators,
      recordedRealCourses,
    };
  }, [academicYear, grades, indicatorDataByCourse, schoolId, selectedStudent, semester, studentCourses]);

  // Student Behavior, SDQ, Homework & Infirmary
  const studentBehavior = useMemo(() => {
    if (!selectedStudent) {
      return {
        records: [] as BehaviorRecord[],
        meritPoints: 0,
        demeritPoints: 0,
        netScore: 100,
      };
    }
    const list = behaviorRecords
      .filter((b) => b.studentId === selectedStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const meritPoints = list
      .filter((b) => b.type === 'merit')
      .reduce((s, b) => s + Math.abs(b.points), 0);
    const demeritPoints = list
      .filter((b) => b.type === 'demerit')
      .reduce((s, b) => s + Math.abs(b.points), 0);
    return {
      records: list,
      meritPoints,
      demeritPoints,
      netScore: Math.max(0, 100 + meritPoints - demeritPoints),
    };
  }, [behaviorRecords, selectedStudent]);

  const latestSdq = useMemo(() => {
    if (!selectedStudent) return null;
    const list = sdqAssessments
      .filter((s) => s.studentId === selectedStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    return list[0] || null;
  }, [sdqAssessments, selectedStudent]);

  const studentHomeworkStats = useMemo(() => {
    if (!selectedStudent) return { total: 0, submittedOrGraded: 0, pending: 0 };
    const list = homeworkSubmissions.filter((h) => h.studentId === selectedStudent.id);
    const submittedOrGraded = list.filter(
      (h) => h.status === 'submitted' || h.status === 'graded' || h.status === 'late'
    ).length;
    const pending = list.filter((h) => h.status === 'pending').length;
    return { total: list.length, submittedOrGraded, pending };
  }, [homeworkSubmissions, selectedStudent]);

  const studentInfirmaryCount = useMemo(() => {
    if (!selectedStudent) return 0;
    return infirmaryVisits.filter((v) => v.studentId === selectedStudent.id).length;
  }, [infirmaryVisits, selectedStudent]);

  // Qualitative Assessments (synced with ปพ.5 / ปพ.6 / ปพ.1)
  const studentQual = useMemo(
    () =>
      selectedStudent
        ? getStudentQualitativeRecord(qualitativeMap, selectedStudent.id)
        : createDefaultStudentQualitative(''),
    [qualitativeMap, selectedStudent]
  );

  const studentQualSummary = useMemo(
    () => summarizeStudentQualitative(studentQual),
    [studentQual]
  );

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

  const handleSynthesizeHomeroomNote = () => {
    if (!selectedStudent || !academicSummary) return;
    const fullName = `${getStudentShortPrefixTh(selectedStudent)} ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`.trim();

    const academicPhrase = academicSummary.hideGpaCalculations
      ? `มีคะแนนเฉลี่ยรายวิชา ${academicSummary.averageRawScore ?? 0}% (${getRawScoreFeedback(academicSummary.averageRawScore).labelTh})`
      : `มีผลการเรียนเฉลี่ยภาคเรียน (GPA) ${academicSummary.termGpa?.toFixed(2) ?? '0.00'} และสะสม (GPAX) ${academicSummary.gpax?.toFixed(2) ?? '0.00'}`;

    const weakSubjects = cycleGradeEntries
      .filter((e) => !e.resolved.passed || e.grade.totalScore < 60)
      .slice(0, 2)
      .map((e) => e.course?.titleTh || e.course?.code || '')
      .filter(Boolean);

    const indicatorRate =
      indicatorSummaries.totalIndicators > 0
        ? Math.round((indicatorSummaries.passedIndicators / indicatorSummaries.totalIndicators) * 100)
        : 100;

    const indicatorPhrase =
      indicatorSummaries.failedIndicators > 0
        ? `ผ่านตัวชี้วัด ${indicatorSummaries.passedIndicators}/${indicatorSummaries.totalIndicators} ตัวชี้วัด (${indicatorRate}%) ควรซ่อมเสริมตัวชี้วัดที่ยังไม่ผ่านจำนวน ${indicatorSummaries.failedIndicators} ตัวชี้วัด`
        : `ผ่านตัวชี้วัดตามหลักสูตร ${indicatorSummaries.passedIndicators}/${indicatorSummaries.totalIndicators} ตัวชี้วัด (${indicatorRate}%)`;

    const attPhrase =
      studentAttendanceSummary.attendancePercent >= 90
        ? `มีเวลาเรียนสม่ำเสมอ ${studentAttendanceSummary.attendancePercent}%`
        : studentAttendanceSummary.attendancePercent >= 80
        ? `มีเวลาเรียน ${studentAttendanceSummary.attendancePercent}% (ผ่านเกณฑ์ 80%)`
        : `ควรติดตามเวลาเรียนอย่างใกล้ชิด (ปัจจุบัน ${studentAttendanceSummary.attendancePercent}% เสี่ยง มส.)`;

    const behPhrase = `คะแนนความประพฤติสุทธิ ${studentBehavior.netScore} คะแนน` +
      (latestSdq
        ? ` และผลประเมิน SDQ อยู่ในเกณฑ์${
            latestSdq.overallStatus === 'normal'
              ? 'ปกติ'
              : latestSdq.overallStatus === 'risk'
              ? 'กลุ่มเสี่ยง (ควรให้คำปรึกษาเชิงรุก)'
              : 'มีปัญหา (ควรส่งต่อแนะแนว/ดูแลใกล้ชิด)'
          }`
        : '');

    const supportSuffix =
      weakSubjects.length > 0
        ? ` แนะนำเสริมทักษะเพิ่มเติมในรายวิชา ${weakSubjects.join(' และ ')} ร่วมกับผู้ปกครองอย่างต่อเนื่อง`
        : ' ขอชื่นชมความรับผิดชอบและส่งเสริมให้พัฒนาศักยภาพต่อเนื่อง';

    const synthesized = `${fullName} ${academicPhrase} ${indicatorPhrase} ด้านวินัยและการเข้าเรียน${attPhrase} โดยมี${behPhrase}.${supportSuffix}`;

    updateSelectedStudentQual((prev) => ({
      ...prev,
      homeroomComment: synthesized,
    }));
    setActionFeedback('สังเคราะห์บันทึกครูประจำชั้นจากข้อมูลเกรด ตัวชี้วัด เวลาเรียน และพฤติกรรมเรียบร้อยแล้ว');
  };

  const handleSaveQuickBehavior = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !onAddBehaviorRecord) return;
    const newRecord: BehaviorRecord = {
      id: `beh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      schoolId,
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`.trim(),
      studentRoom: selectedStudent.room,
      date: getLocalDateString(),
      type: quickBehType,
      points: Math.abs(Number(quickBehPoints) || 5),
      category: quickBehCategory.trim() || (quickBehType === 'merit' ? 'ทำความดี' : 'ตักเตือนพฤติกรรม'),
      notes: quickBehNotes.trim() || 'บันทึกจากสมุดบันทึกพัฒนาคุณภาพผู้เรียน (ครูประจำชั้น)',
      recordedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูประจำชั้น',
      lineNotified: false,
    };
    onAddBehaviorRecord(newRecord);
    setQuickBehNotes('');
    setShowQuickBehaviorForm(false);
    setActionFeedback(`เพิ่มบันทึกพฤติกรรมของ ${selectedStudent.firstNameTh} เรียบร้อยแล้ว`);
  };

  const handleExportCsv = () => {
    if (!selectedStudent || !academicSummary) return;
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ชั้น/ห้อง',
      'GPAX',
      'เวลาเรียน (%)',
      'ตัวชี้วัดผ่าน/ทั้งหมด',
      'คะแนนความประพฤติสุทธิ',
      'สถานะ SDQ',
      'คุณลักษณะอันพึงประสงค์',
      'การอ่าน คิดวิเคราะห์ เขียน',
      'สมรรถนะ 5 ด้าน',
      'ความเห็นครูประจำชั้น',
    ];
    const row = [
      `"${selectedStudent.studentIdNumber}"`,
      `"${getStudentShortPrefixTh(selectedStudent)} ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}"`,
      `"${selectedStudent.gradeLevel} (${selectedStudent.room})"`,
      `"${academicSummary.gpax !== null ? academicSummary.gpax.toFixed(2) : `${academicSummary.averageRawScore ?? 0}%`}"`,
      `${studentAttendanceSummary.attendancePercent}%`,
      `"${indicatorSummaries.passedIndicators}/${indicatorSummaries.totalIndicators}"`,
      studentBehavior.netScore,
      `"${latestSdq ? latestSdq.overallStatus : 'ยังไม่ประเมิน'}"`,
      `"${studentQualSummary.attrLabel}"`,
      `"${studentQualSummary.readingLabel}"`,
      `"${studentQualSummary.compLabel}"`,
      `"${(studentQual.homeroomComment || '').replace(/"/g, '""')}"`,
    ];
    const csv = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `สมุดพัฒนาคุณภาพผู้เรียน_${selectedStudent.studentIdNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!printSheetRef.current || !selectedStudent) return;
    printHtmlElementInIsolatedFrame(
      printSheetRef.current.innerHTML,
      `สมุดบันทึกพัฒนาคุณภาพผู้เรียน_${selectedStudent.studentIdNumber}`
    );
  };

  const moduleGroup = getModuleGroupMeta('student_development_book');

  if (!selectedStudent) {
    return (
      <div className="p-8 text-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-text-muted)]">
        ไม่พบข้อมูลนักเรียนในระบบ
      </div>
    );
  }

  const riskInfo = studentRiskLookup.get(selectedStudent.id);
  const canEdit = ['super_admin', 'admin', 'teacher'].includes(currentRole);

  return (
    <div className={`${getModuleTone('student_development_book')} h-full flex flex-col min-h-0 overflow-hidden space-y-2`}>
      {/* Compact Header */}
      <div className="shrink-0 px-3 py-2 app-page-header flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="tone-chip w-7 h-7 rounded-lg">
            <BookOpen className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-sm font-bold text-[var(--color-text-title)] truncate">
              สมุดบันทึกพัฒนาคุณภาพผู้เรียน (รายบุคคลรอบด้าน)
            </h1>
            <span className="hidden xl:inline module-category-kicker">
              {lang === 'th' ? moduleGroup.labelTh : moduleGroup.labelEn}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {canEdit && onAddBehaviorRecord && (
            <button
              type="button"
              onClick={() => setShowQuickBehaviorForm((prev) => !prev)}
              className="btn-tool-tone px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 tone-text" />
              <span>บันทึกพฤติกรรม</span>
            </button>
          )}
          {onOpenCoreReportCard && (
            <button
              type="button"
              onClick={() => onOpenCoreReportCard(selectedStudent.id)}
              className="btn-tool-tone px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5 tone-text" />
              <span>Report Card วิชาพื้นฐาน</span>
            </button>
          )}
          {onOpenQualitativeSummary && (
            <button
              type="button"
              onClick={onOpenQualitativeSummary}
              className="btn-tool-neutral px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>สรุปคุณลักษณะฯ รายชั้น</span>
            </button>
          )}
          {onOpenReportCard && (
            <button
              type="button"
              onClick={() => onOpenReportCard(selectedStudent)}
              className="btn-tool-neutral px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ใบรายงานผล (ปพ.1)</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-tool-neutral px-2.5 py-1.5 text-xs whitespace-nowrap"
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
            <span>พิมพ์สมุดพัฒนาการ (A4)</span>
          </button>
        </div>
      </div>

      {/* Student Selector & Filter Bar */}
      <div className="shrink-0 toolbar-filter-zone print:hidden flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหานักเรียน (ชื่อ รหัส เลข ปชช. ห้อง)..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-1.5 pl-8 pr-7 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--tone)]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          aria-label="กรองห้องเรียน"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
        >
          <option value="all">ทุกห้อง ({students.length} คน)</option>
          {roomOptions.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>

        <div className="seg-tab-group shrink-0">
          <button
            type="button"
            data-active={priorityFilter === 'all'}
            onClick={() => setPriorityFilter('all')}
            className="seg-tab-btn text-xs"
          >
            ทั้งหมด ({filteredStudents.length})
          </button>
          <button
            type="button"
            data-active={priorityFilter === 'attention'}
            onClick={() => setPriorityFilter('attention')}
            className="seg-tab-btn text-xs"
          >
            กลุ่มต้องดูแลพิเศษ
          </button>
        </div>

        <select
          aria-label="เลือกนักเรียน"
          value={selectedStudent.id}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="flex-1 min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
        >
          {filteredStudents.length === 0 ? (
            <option value={selectedStudent.id}>ไม่พบนักเรียนที่ตรงเงื่อนไข</option>
          ) : (
            filteredStudents.map((stu) => {
              const flagged = studentRiskLookup.get(stu.id)?.needsAttention;
              return (
                <option key={stu.id} value={stu.id}>
                  {stu.studentIdNumber} · {stu.firstNameTh} {stu.lastNameTh} ({stu.room})
                  {flagged ? ' [ต้องติดตาม]' : ''}
                </option>
              );
            })
          )}
        </select>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={currentIdx <= 0}
            onClick={() => {
              if (currentIdx > 0) setSelectedStudentId(filteredStudents[currentIdx - 1].id);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
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
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Feedback Notice */}
      {actionFeedback && (
        <div className="shrink-0 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 print:hidden">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback}</span>
          </span>
          <button type="button" onClick={() => setActionFeedback(null)} className="underline cursor-pointer">
            ปิด
          </button>
        </div>
      )}

      {/* Quick Behavior Logger Panel */}
      {showQuickBehaviorForm && canEdit && onAddBehaviorRecord && (
        <form
          onSubmit={handleSaveQuickBehavior}
          className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2.5 print:hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-[var(--color-text-title)]">
              บันทึกพฤติกรรมรายบุคคล — {selectedStudent.firstNameTh} {selectedStudent.lastNameTh} ({selectedStudent.room})
            </h3>
            <button
              type="button"
              onClick={() => setShowQuickBehaviorForm(false)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <select
              value={quickBehType}
              onChange={(e) => {
                const nextType = e.target.value === 'demerit' ? 'demerit' : 'merit';
                setQuickBehType(nextType);
                const list = nextType === 'merit' ? presets.behaviorMeritPresets : presets.behaviorDemeritPresets;
                if (list[0]) {
                  setQuickBehCategory(list[0].label);
                  setQuickBehPoints(list[0].points);
                }
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[var(--color-text-title)]"
            >
              <option value="merit">บันทึกความดี / พฤติกรรมเชิงบวก (+)</option>
              <option value="demerit">ข้อสังเกต / พฤติกรรมเสี่ยง (-)</option>
            </select>

            <select
              value={quickBehCategory}
              onChange={(e) => {
                const label = e.target.value;
                setQuickBehCategory(label);
                const list = quickBehType === 'merit' ? presets.behaviorMeritPresets : presets.behaviorDemeritPresets;
                const matched = list.find((p) => p.label === label);
                if (matched) setQuickBehPoints(matched.points);
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[var(--color-text-title)]"
            >
              {(quickBehType === 'merit' ? presets.behaviorMeritPresets : presets.behaviorDemeritPresets).map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} ({quickBehType === 'merit' ? '+' : '-'}{p.points})
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={50}
              value={quickBehPoints}
              onChange={(e) => setQuickBehPoints(Math.max(1, Number(e.target.value) || 1))}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 font-mono text-[var(--color-text-title)]"
              placeholder="คะแนน"
            />

            <div className="flex gap-1.5">
              <input
                type="text"
                value={quickBehNotes}
                onChange={(e) => setQuickBehNotes(e.target.value)}
                placeholder="รายละเอียดเหตุการณ์/คำแนะนำ..."
                className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-[var(--color-text-title)]"
              />
              <button
                type="submit"
                className="btn-action-primary px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                บันทึก
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Unified Single-Page Dossier Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-4 print:overflow-visible">
        <div ref={printSheetRef} className="space-y-4">
          {/* Print Header */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-3 text-center">
            <p className="text-xs font-bold">สมุดบันทึกพัฒนาคุณภาพผู้เรียนรายบุคคล (สำหรับครูประจำชั้น / งานแนะแนว)</p>
            <h2 className="text-lg font-extrabold">โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}</h2>
            <p className="text-xs">
              {formatSemesterLabel(semester)} ปีการศึกษา {academicYear}
            </p>
          </div>

          {/* Section 1: Student Profile + 4 Core Development Dimensions */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-center overflow-hidden shrink-0">
                  {selectedStudent.avatarUrl ? (
                    <img
                      src={selectedStudent.avatarUrl}
                      alt={`${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold text-[var(--color-text-title)]">
                      {(selectedStudent.firstNameTh || 'น').slice(0, 2)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-title)]">
                      {getStudentShortPrefixTh(selectedStudent)} {selectedStudent.firstNameTh} {selectedStudent.lastNameTh}
                    </h2>
                    <span className="text-xs font-mono text-[var(--color-primary-text)] font-bold">
                      {selectedStudent.studentIdNumber}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{selectedStudent.gradeLevel} ({selectedStudent.room})</span>
                    <span aria-hidden="true">·</span>
                    <span>{getEducationStageLabelTh(academicSummary?.stage || 'lower_secondary')}</span>
                    {selectedStudent.academicTrack && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>แผนการเรียน: {selectedStudent.academicTrack}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>ผู้ปกครอง: {selectedStudent.guardianName} ({selectedStudent.guardianPhone})</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                {riskInfo?.needsAttention ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>ต้องติดตามใกล้ชิด: {riskInfo.reasons.join(' · ')}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>พัฒนาการทุกด้านอยู่ในเกณฑ์ปกติ</span>
                  </div>
                )}
                <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  ภาระงานส่งแล้ว {studentHomeworkStats.submittedOrGraded}/{studentHomeworkStats.total} ชิ้น · เข้าห้องพยาบาล {studentInfirmaryCount} ครั้ง
                </div>
              </div>
            </div>

            {/* 4 Core KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 tabular-nums">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-1">
                <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>๑. ผลสัมฤทธิ์ทางการเรียน</span>
                  <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {academicSummary?.hideGpaCalculations
                    ? `${academicSummary.averageRawScore ?? 0}%`
                    : `GPAX ${(academicSummary?.gpax ?? 0).toFixed(2)}`}
                </div>
                <div className="text-[11px] text-[var(--color-text-body)]">
                  {academicSummary?.hideGpaCalculations
                    ? getRawScoreFeedback(academicSummary.averageRawScore).labelTh
                    : `GPA ภาคเรียน: ${(academicSummary?.termGpa ?? 0).toFixed(2)} · ประเมินแล้ว ${cycleGradeEntries.length} วิชา`}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-1">
                <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>๒. สถิติตัวชี้วัดตามหลักสูตร</span>
                  <ListChecks className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {indicatorSummaries.passedIndicators}/{indicatorSummaries.totalIndicators}
                  <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1.5">
                    ({indicatorSummaries.totalIndicators > 0
                      ? Math.round((indicatorSummaries.passedIndicators / indicatorSummaries.totalIndicators) * 100)
                      : 0}%)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-body)]">
                  {indicatorSummaries.failedIndicators > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      ยังไม่ผ่าน {indicatorSummaries.failedIndicators} ตัวชี้วัด
                    </span>
                  ) : (
                    <span>
                      {indicatorSummaries.recordedRealCourses > 0
                        ? `บันทึกคะแนนจริง ${indicatorSummaries.recordedRealCourses} วิชา`
                        : 'เทียบเกณฑ์มาตรฐาน สพฐ.'}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-1">
                <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>๓. เวลาเรียนและการเข้าเรียน</span>
                  <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="text-xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {studentAttendanceSummary.attendancePercent.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[var(--color-text-body)]">
                  {studentAttendanceSummary.totalRecords > 0
                    ? `มา ${studentAttendanceSummary.presentCount} · สาย ${studentAttendanceSummary.lateCount} · ลา ${studentAttendanceSummary.sickCount + studentAttendanceSummary.leaveCount} · ขาด ${studentAttendanceSummary.absentCount}`
                    : studentAttendanceSummary.isAtRiskMs
                    ? 'เสี่ยง มส. (< 80%)'
                    : 'มีสิทธิ์สอบตามเกณฑ์ (≥ 80%)'}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-1">
                <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                  <span>๔. พฤติกรรม &amp; คัดกรอง SDQ</span>
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xl font-extrabold font-mono text-[var(--color-text-title)]">
                  {studentBehavior.netScore} คะแนน
                </div>
                <div className="text-[11px] text-[var(--color-text-body)]">
                  ดี +{studentBehavior.meritPoints} / หัก -{studentBehavior.demeritPoints} · SDQ:{' '}
                  <span
                    className={
                      latestSdq?.overallStatus === 'problem'
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : latestSdq?.overallStatus === 'risk'
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-emerald-700 dark:text-emerald-300 font-semibold'
                    }
                  >
                    {latestSdq
                      ? latestSdq.overallStatus === 'normal'
                        ? 'ปกติ'
                        : latestSdq.overallStatus === 'risk'
                        ? 'กลุ่มเสี่ยง'
                        : 'มีปัญหา'
                      : 'รอคัดกรอง'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Academic Grades Across Subjects */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                ส่วนที่ ๑ · ข้อมูลเกรดและเวลาเรียนรายวิชา ({cycleGradeEntries.length} วิชา)
              </h3>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                คุณลักษณะฯ: <strong className="text-[var(--color-text-title)]">{studentQualSummary.attrLabel}</strong> · อ่าน คิดวิเคราะห์ เขียน: <strong className="text-[var(--color-text-title)]">{studentQualSummary.readingLabel}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-semibold">
                  <tr>
                    <th className="py-2 px-3">รหัสวิชา</th>
                    <th className="py-2 px-3">รายวิชา / กลุ่มสาระฯ</th>
                    <th className="py-2 px-2 text-center">หน่วยกิต</th>
                    <th className="py-2 px-2 text-right">เก็บ/กลางภาค</th>
                    <th className="py-2 px-2 text-right">ปลายภาค</th>
                    <th className="py-2 px-2 text-right">รวม (%)</th>
                    <th className="py-2 px-2 text-center">เกรด / ผลประเมิน</th>
                    <th className="py-2 px-2 text-right">เวลาเรียน (%)</th>
                    <th className="py-2 px-3">สถานะการติดตาม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] tabular-nums">
                  {cycleGradeEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-[var(--color-text-muted)]">
                        ยังไม่มีบันทึกคะแนนรายวิชาของนักเรียนในภาคเรียน/ปีการศึกษานี้
                      </td>
                    </tr>
                  ) : (
                    cycleGradeEntries.map(({ grade, course, resolved }) => {
                      if (!course) return null;
                      const area = resolveMoeLearningArea(course);
                      const courseAtt = calculateDetailedCourseAttendance({
                        student: selectedStudent,
                        course,
                        timetableSlots,
                        attendance,
                        periodAttendance,
                      });
                      const needsRemedial = !resolved.passed || grade.totalScore < 50 || courseAtt.isAtRiskMs;
                      const midPart = grade.assignmentScore + grade.quizScore + grade.midtermScore;
                      return (
                        <tr key={grade.id} className="hover:bg-[var(--color-card-subtle)]/60">
                          <td className="py-2 px-3 font-mono font-bold text-[var(--color-primary-text)]">
                            {course.code}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[var(--color-text-title)]">{course.titleTh}</div>
                            <div className="text-[11px] text-[var(--color-text-muted)]">{area.nameTh}</div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono">
                            {resolved.isActivity ? 'กิจกรรม' : course.credits.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">{midPart}</td>
                          <td className="py-2 px-2 text-right font-mono">{grade.finalScore}</td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-[var(--color-text-title)]">
                            {grade.totalScore}%
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold">
                            <span
                              className={
                                needsRemedial
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : resolved.point >= 3.5 || grade.totalScore >= 75 || resolved.letter === 'ผ'
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-[var(--color-text-title)]'
                              }
                            >
                              {resolved.letter}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            <span className={courseAtt.isAtRiskMs ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                              {courseAtt.attendancePercent}%
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {needsRemedial ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{courseAtt.isAtRiskMs ? 'เสี่ยง มส. / ติดตามเวลาเรียน' : 'ควรจัดซ่อมเสริม'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>ผ่านเกณฑ์</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 & 4 Split Grid: Learning Indicators + Behavior & SDQ */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Section 3: Learning Indicators Breakdown */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    ส่วนที่ ๒ · ผลการประเมินตัวชี้วัดรายวิชา
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {loadingIndicators
                      ? 'กำลังโหลดข้อมูลตัวชี้วัด...'
                      : `ผ่าน ${indicatorSummaries.passedIndicators}/${indicatorSummaries.totalIndicators} ตัวชี้วัด`}
                  </p>
                </div>
                <div className="seg-tab-group print:hidden">
                  <button
                    type="button"
                    data-active={indicatorViewFilter === 'all'}
                    onClick={() => setIndicatorViewFilter('all')}
                    className="seg-tab-btn text-[11px]"
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    data-active={indicatorViewFilter === 'needs_support'}
                    onClick={() => setIndicatorViewFilter('needs_support')}
                    className="seg-tab-btn text-[11px]"
                  >
                    เฉพาะที่ยังไม่ผ่าน ({indicatorSummaries.failedIndicators})
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--color-border)] max-h-[460px] overflow-y-auto print:max-h-none print:overflow-visible">
                {indicatorSummaries.byCourse.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                    ไม่พบรายวิชาที่ลงทะเบียนของนักเรียนคนนี้
                  </div>
                ) : (
                  indicatorSummaries.byCourse.map((cs) => {
                    const visibleItems =
                      indicatorViewFilter === 'needs_support'
                        ? cs.items.filter((i) => i.result === 'not_pass')
                        : cs.items;
                    if (indicatorViewFilter === 'needs_support' && visibleItems.length === 0) {
                      return null;
                    }
                    return (
                      <div key={cs.course.id} className="p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-xs text-[var(--color-primary-text)] mr-1.5">
                              {cs.course.code}
                            </span>
                            <span className="text-xs font-semibold text-[var(--color-text-title)]">
                              {cs.course.titleTh}
                            </span>
                            <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">
                              · {cs.areaShortTh} · {cs.isRecordedReal ? 'คะแนนตัวชี้วัดจริง' : 'เกณฑ์ สพฐ. (หน่วย 1–3)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[11px] tabular-nums">
                            <span className="font-mono font-semibold text-[var(--color-text-body)]">
                              ผ่าน {cs.passedIndicators}/{cs.totalIndicators}
                            </span>
                            {onOpenCourseIndicators && (
                              <button
                                type="button"
                                onClick={() => onOpenCourseIndicators(cs.course.id)}
                                className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer print:hidden whitespace-nowrap"
                              >
                                บันทึก/ดูตัวชี้วัด
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          {visibleItems.slice(0, 6).map((ind) => (
                            <div
                              key={ind.id}
                              className="flex items-start justify-between gap-2 text-[11px] py-1 px-2 rounded-md bg-[var(--color-card-subtle)]"
                            >
                              <div className="min-w-0">
                                <span className="font-mono font-bold text-[var(--color-text-title)] mr-1.5">
                                  {ind.code}
                                </span>
                                <span className="text-[var(--color-text-body)]">{ind.title}</span>
                                {ind.evidence && (
                                  <div className="text-[10px] text-[var(--color-text-muted)]">
                                    หลักฐาน: {ind.evidence}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                                <span className="font-bold text-[var(--color-text-title)]">
                                  {ind.score}/{ind.maxScore}
                                </span>
                                <span
                                  className={
                                    ind.result === 'pass'
                                      ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                                      : ind.result === 'not_pass'
                                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                      : 'text-[var(--color-text-muted)]'
                                  }
                                >
                                  {ind.result === 'pass'
                                    ? 'ผ่าน'
                                    : ind.result === 'not_pass'
                                    ? 'ไม่ผ่าน'
                                    : 'รอประเมิน'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {visibleItems.length > 6 && (
                            <p className="text-[10px] text-[var(--color-text-muted)] px-1">
                              และอีก {visibleItems.length - 6} ตัวชี้วัดในวิชานี้
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Section 4: Behavior Records, SDQ 5 Domains & Student Care */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                    ส่วนที่ ๓ · บันทึกพฤติกรรม วินัย และผลคัดกรอง SDQ
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    ความประพฤติสุทธิ {studentBehavior.netScore} คะแนน ({studentBehavior.records.length} รายการ)
                  </p>
                </div>
                {onOpenBehaviorSdq && (
                  <button
                    type="button"
                    onClick={onOpenBehaviorSdq}
                    className="text-xs font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer print:hidden whitespace-nowrap"
                  >
                    เปิดระบบดูแลช่วยเหลือ &amp; SDQ
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Latest SDQ 5 Domains */}
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>แบบประเมินพฤติกรรมเด็ก (SDQ ๕ ด้าน)</span>
                    </span>
                    {latestSdq ? (
                      <span
                        className={`font-semibold ${
                          latestSdq.overallStatus === 'problem'
                            ? 'text-rose-600 dark:text-rose-400'
                            : latestSdq.overallStatus === 'risk'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {latestSdq.overallStatus === 'normal'
                          ? 'ปกติ'
                          : latestSdq.overallStatus === 'risk'
                          ? 'กลุ่มเสี่ยง'
                          : 'มีปัญหา'}{' '}
                        (รวมปัญหา {latestSdq.totalDifficultiesScore}/40)
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">ยังไม่มีผลคัดกรองในเทอมนี้</span>
                    )}
                  </div>

                  {latestSdq && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] tabular-nums">
                      {[
                        { label: 'ด้านอารมณ์', val: latestSdq.emotionalScore },
                        { label: 'ความประพฤติ', val: latestSdq.conductScore },
                        { label: 'อยู่ไม่นิ่ง', val: latestSdq.hyperactivityScore },
                        { label: 'สัมพันธ์เพื่อน', val: latestSdq.peerScore },
                        { label: 'สัมพันธภาพทางสังคม', val: latestSdq.prosocialScore },
                      ].map((d) => (
                        <div
                          key={d.label}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-center"
                        >
                          <div className="text-[10px] text-[var(--color-text-muted)] truncate">{d.label}</div>
                          <div className="font-mono font-bold text-[var(--color-text-title)]">{d.val}/10</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Behavior Timeline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--color-text-title)]">
                      ประวัติบันทึกพฤติกรรม (ความดี / ข้อสังเกต)
                    </span>
                    {canEdit && onAddBehaviorRecord && (
                      <button
                        type="button"
                        onClick={() => setShowQuickBehaviorForm(true)}
                        className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer print:hidden"
                      >
                        + เพิ่มรายการ
                      </button>
                    )}
                  </div>

                  {studentBehavior.records.length === 0 ? (
                    <div className="py-5 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-lg">
                      ยังไม่มีประวัติบันทึกพฤติกรรมเพิ่มเติมสำหรับนักเรียนคนนี้
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-lg max-h-64 overflow-y-auto print:max-h-none print:overflow-visible">
                      {studentBehavior.records.map((rec) => (
                        <div key={rec.id} className="p-2.5 flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`font-bold ${
                                  rec.type === 'merit'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {rec.type === 'merit' ? 'ความดี' : 'ข้อสังเกต/วินัย'}
                              </span>
                              <span className="font-semibold text-[var(--color-text-title)]">
                                {rec.category}
                              </span>
                              <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                                · {rec.date}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-body)]">{rec.notes}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">
                              ผู้บันทึก: {rec.recordedBy}
                            </p>
                          </div>
                          <span
                            className={`font-mono font-bold tabular-nums shrink-0 ${
                              rec.type === 'merit'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {rec.type === 'merit' ? `+${Math.abs(rec.points)}` : `-${Math.abs(rec.points)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Section 5: Qualitative Attributes, Reading/Writing, Competencies & Homeroom Journal */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  ส่วนที่ ๔ · สรุปผลพัฒนาการตามเกณฑ์ สพฐ. และบันทึกข้อเสนอแนะครูประจำชั้น (ซิงค์กับ ปพ.๕ / ปพ.๖ / ปพ.๑)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  ผลประเมินคุณลักษณะฯ ๘ ประการ, การอ่าน คิดวิเคราะห์ เขียน ๕ มิติ, สมรรถนะสำคัญ ๕ ด้าน และกิจกรรมพัฒนาผู้เรียน
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => setShowQualEditor((prev) => !prev)}
                    className="btn-tool-neutral px-2.5 py-1 text-xs whitespace-nowrap"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{showQualEditor ? 'ซ่อนตารางปรับคะแนนคุณลักษณะฯ' : 'ปรับคะแนนคุณลักษณะฯ / อ่านเขียน'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSynthesizeHomeroomNote}
                    className="btn-tool-tone px-2.5 py-1 text-xs whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 tone-text" />
                    <span>สังเคราะห์ความเห็นครูประจำชั้น</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">คุณลักษณะอันพึงประสงค์ ๘ ประการ</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {studentQualSummary.attrLabel}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">การอ่าน คิดวิเคราะห์ และเขียน</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {studentQualSummary.readingLabel} ({studentQualSummary.readingPercent}%)
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">สมรรถนะสำคัญของผู้เรียน ๕ ด้าน</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {studentQualSummary.compLabel}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3">
                <div className="text-[11px] text-[var(--color-text-muted)]">กิจกรรมพัฒนาผู้เรียน</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {studentQualSummary.activityResult}
                </div>
              </div>
            </div>

            {showQualEditor && canEdit && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 text-xs print:hidden">
                <div className="space-y-2">
                  <div className="font-bold text-[var(--color-text-title)]">
                    คุณลักษณะอันพึงประสงค์ ๘ ประการ (ระดับ ๐–๓)
                  </div>
                  <div className="space-y-1.5">
                    {MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((attr, idx) => (
                      <div key={attr.index} className="flex items-center justify-between gap-2">
                        <span className="text-[var(--color-text-body)] truncate">
                          {attr.titleTh}
                        </span>
                        <select
                          value={studentQual.attributes[idx] ?? 3}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateSelectedStudentQual((prev) => {
                              const nextAttrs = [...prev.attributes];
                              nextAttrs[idx] = val;
                              return { ...prev, attributes: nextAttrs };
                            });
                          }}
                          className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 font-mono text-xs text-[var(--color-text-title)]"
                        >
                          <option value={3}>3 (ดีเยี่ยม)</option>
                          <option value={2}>2 (ดี)</option>
                          <option value={1}>1 (ผ่าน)</option>
                          <option value={0}>0 (ไม่ผ่าน)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="font-bold text-[var(--color-text-title)]">
                      การอ่าน คิดวิเคราะห์ และเขียน ๕ มิติ (ระดับ ๐–๓)
                    </div>
                    <div className="space-y-1.5">
                      {MOE_READING_WRITING_RUBRIC.map((rw, idx) => (
                        <div key={rw.index} className="flex items-center justify-between gap-2">
                          <span className="text-[var(--color-text-body)] truncate">
                            {rw.titleTh}
                          </span>
                          <select
                            value={studentQual.readingWriting[idx] ?? 3}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateSelectedStudentQual((prev) => {
                                const nextRw = [...prev.readingWriting];
                                nextRw[idx] = val;
                                return { ...prev, readingWriting: nextRw };
                              });
                            }}
                            className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 font-mono text-xs text-[var(--color-text-title)]"
                          >
                            <option value={3}>3 (ดีเยี่ยม)</option>
                            <option value={2}>2 (ดี)</option>
                            <option value={1}>1 (ผ่าน)</option>
                            <option value={0}>0 (ไม่ผ่าน)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                    <div className="font-bold text-[var(--color-text-title)]">
                      สมรรถนะสำคัญ ๕ ด้าน &amp; กิจกรรมพัฒนาผู้เรียน
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {MOE_KEY_COMPETENCIES.map((comp, idx) => (
                        <div key={comp} className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] text-[var(--color-text-body)] truncate">{comp}</span>
                          <select
                            value={studentQual.competencies[idx] ?? 3}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateSelectedStudentQual((prev) => {
                                const nextComp = [...prev.competencies];
                                nextComp[idx] = val;
                                return { ...prev, competencies: nextComp };
                              });
                            }}
                            className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-0.5 font-mono text-[11px]"
                          >
                            <option value={3}>3</option>
                            <option value={2}>2</option>
                            <option value={1}>1</option>
                            <option value={0}>0</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {MOE_STUDENT_ACTIVITIES.map((act, idx) => (
                        <div key={act.name} className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] text-[var(--color-text-body)] truncate">{act.name}</span>
                          <select
                            value={studentQual.activities[idx] || 'ผ (ผ่าน)'}
                            onChange={(e) => {
                              const val = e.target.value === 'มผ (ไม่ผ่าน)' ? 'มผ (ไม่ผ่าน)' : 'ผ (ผ่าน)';
                              updateSelectedStudentQual((prev) => {
                                const nextActs = [...prev.activities];
                                nextActs[idx] = val;
                                return { ...prev, activities: nextActs };
                              });
                            }}
                            className="rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-0.5 text-[11px]"
                          >
                            <option value="ผ (ผ่าน)">ผ</option>
                            <option value="มผ (ไม่ผ่าน)">มผ</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Homeroom Comment Box */}
            <div className="space-y-1.5">
              <label
                htmlFor="homeroom-dev-comment"
                className="block text-xs font-bold text-[var(--color-text-title)]"
              >
                ความเห็นและข้อเสนอแนะเพื่อพัฒนาผู้เรียนของครูประจำชั้น
              </label>
              <textarea
                id="homeroom-dev-comment"
                rows={3}
                readOnly={!canEdit}
                value={studentQual.homeroomComment || ''}
                onChange={(e) =>
                  updateSelectedStudentQual((prev) => ({
                    ...prev,
                    homeroomComment: e.target.value,
                  }))
                }
                placeholder="บันทึกพัฒนาการ จุดเด่น สิ่งที่ควรส่งเสริม หรือคลิก 'สังเคราะห์ความเห็นครูประจำชั้น' เพื่อให้ระบบสรุปจากเกรด ตัวชี้วัด และพฤติกรรมให้อัตโนมัติ..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-2.5 text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--tone)] print:hidden"
              />
              <div className="hidden print:block rounded-lg border border-slate-400 p-3 text-xs leading-relaxed">
                {studentQual.homeroomComment?.trim() ||
                  'นักเรียนมีพัฒนาการตามเกณฑ์ของสถานศึกษา และอยู่ระหว่างการติดตามส่งเสริมอย่างต่อเนื่อง'}
              </div>
            </div>

            {/* Print Signature Footer */}
            <div className="hidden print:grid grid-cols-3 gap-6 pt-8 text-center text-xs">
              <div>
                <div className="h-10 border-b border-dotted border-slate-500 mx-4 mb-1" />
                <p className="font-bold">ครูประจำชั้น / ครูที่ปรึกษา</p>
                <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
              </div>
              <div>
                <div className="h-10 border-b border-dotted border-slate-500 mx-4 mb-1" />
                <p className="font-bold">ผู้ปกครอง</p>
                <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
              </div>
              <div>
                <div className="h-10 border-b border-dotted border-slate-500 mx-4 mb-1" />
                <p className="font-bold">หัวหน้าระดับ / ผู้อำนวยการ</p>
                <p className="text-[11px] text-slate-600">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
