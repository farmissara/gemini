import React, { useEffect, useRef, useState } from 'react';
import {
  AdaptivePracticeTopic,
  AppLanguage,
  Assignment,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  Course,
  GradeRecord,
  GradingSystem,
  HomeworkSubmission,
  InfirmaryVisit,
  PeriodAttendanceRecord,
  School,
  SdqAssessment,
  Student,
  SystemConfig,
  Teacher,
  TimetableSlot,
  UserRole,
} from '../types';
import { calculateGrade, formatSemesterLabel, getGradingScaleLegend } from '../lib/schoolSettings';
import { calculateStudentCourseEligibility } from '../lib/examEligibility';
import {
  Award,
  FileText,
  Printer,
  Download,
  CheckCircle,
  Sparkles,
  Search,
  Filter,
  Sliders,
  ChevronRight,
  BookOpen,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  BellRing,
  BellOff,
  Plus,
  Send,
  Upload,
  FileDown,
  X,
  ChevronDown,
  Calculator,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Pp5OfficialForm, Pp6OfficialForm } from '../components/OfficialMoeForms';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { getModuleTone } from '../lib/moduleTheme';
import {
  ChartViewMode,
  GradeDistributionHistogram,
  HistogramScope,
} from '../components/GradeDistributionHistogram';
import { downloadGradeDistributionReportPdf } from '../lib/moeReportPdf';
import { EmptyState } from '../components/common/EmptyState';
import { emitAppToast } from '../components/common/ToastProvider';
import {
  calculateStudentAcademicSummary,
  clampScore,
  detectCourseEducationStage,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentPrefixTh,
  getStudentShortPrefixTh,
  isActivityCourse,
  isPrimaryStage,
  matchesEducationLevelFilter,
  resolveEffectiveGrade,
  shouldShowCourseCredits,
} from '../lib/moeGrading';
import { dispatchGradeAlert, GradeAlertRecord } from '../lib/gradeNotifications';
import { TableActionMenu, TableActionItem } from '../components/common/TableActionMenu';
import {
  buildCourseTeacherOptions,
  courseMatchesTeacherFilter,
  resolveTeacherFilterKeyForUser,
} from '../lib/courseTeacherFilter';
import { LearningIndicatorAssessmentPanel } from '../components/LearningIndicatorAssessmentPanel';
import { resolveMoeLearningArea } from '../data/moeCurriculumStandards';
import {
  calculateDetailedCourseAttendance,
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import { GradeLevelQualitativeSummaryView } from '../components/GradeLevelQualitativeSummaryView';
import { CoreSubjectsReportCardView } from '../components/CoreSubjectsReportCardView';
import { Pp5CoreRoomSummaryView } from '../components/Pp5CoreRoomSummaryView';
import { ThreeSemesterAchievementTrendChart } from '../components/ThreeSemesterAchievementTrendChart';
import { MoeDocViewSelection, MoeStudentDocumentCenter } from '../components/MoeStudentDocumentCenter';
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal';
import {
  getPp3ApprovalStatusMeta,
  getStudentRegistryRecord,
  loadSchoolRegistryMap,
  loadSchoolRegistrySigners,
} from '../lib/studentRegistryStore';

interface CourseScoreWeights {
  midterm: number;
  final: number;
  assignment: number;
  quiz: number;
}

const DEFAULT_SCORE_WEIGHTS: CourseScoreWeights = {
  midterm: 30,
  final: 40,
  assignment: 20,
  quiz: 10,
};

const OBEC_WEIGHT_PRESETS: Array<{ id: string; label: string; weights: CourseScoreWeights }> = [
  { id: '60_40', label: 'มาตรฐานระบบ 60:40', weights: { midterm: 30, final: 40, assignment: 20, quiz: 10 } },
  { id: '70_30', label: 'เกณฑ์ สพฐ. 70:30', weights: { midterm: 25, final: 30, assignment: 30, quiz: 15 } },
  { id: '80_20', label: 'เน้นชิ้นงาน/ปฏิบัติ 80:20', weights: { midterm: 20, final: 20, assignment: 45, quiz: 15 } },
  { id: '50_50', label: 'เน้นสอบวัดผล 50:50', weights: { midterm: 25, final: 50, assignment: 15, quiz: 10 } },
];

interface GradebookViewProps {
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  school?: School;
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  onChangeGradingSystem?: (mode: GradingSystem) => Promise<void> | void;
  onUpdateGrade: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade?: (grade: GradeRecord, options?: { notify?: boolean }) => void;
  onDeleteGrade?: (gradeId: string) => Promise<void> | void;
  onNotifyGradeChange?: (grade: GradeRecord, isNewRecord?: boolean) => Promise<GradeAlertRecord | void> | GradeAlertRecord | void;
  onOpenReportCard: (student: Student) => void;
  timetableSlots?: TimetableSlot[];
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  infirmaryVisits?: InfirmaryVisit[];
  homeworkSubmissions?: HomeworkSubmission[];
  assignments?: Assignment[];
  onAddStudent?: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
  onPracticeInAi?: (topic: AdaptivePracticeTopic) => void;
  onOpenImportExport?: () => void;
  onOpenStudentDevBook?: (studentId: string) => void;
  canEditGrades?: boolean;
  initialCourseId?: string;
  initialStudentId?: string;
  initialTab?:
    | 'gradebook'
    | 'indicators'
    | 'moe_student_hub'
    | 'pp5'
    | 'pp5_core_summary'
    | 'pp6'
    | 'core_report_card'
    | 'qualitative_summary'
    | 'pp3_online'
    | 'onet_niets';
  embeddedInStudentManagement?: boolean;
  onSwitchToStudentRegistry?: (studentId?: string, docView?: MoeDocViewSelection) => void;
  lang?: AppLanguage;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  students,
  teachers = [],
  courses,
  grades,
  systemConfig,
  school,
  currentRole = 'teacher',
  currentUser,
  onChangeGradingSystem,
  onUpdateGrade,
  onAddGrade,
  onDeleteGrade,
  onNotifyGradeChange,
  onOpenReportCard,
  timetableSlots = [],
  attendance = [],
  periodAttendance = [],
  behaviorRecords = [],
  sdqAssessments = [],
  infirmaryVisits = [],
  homeworkSubmissions = [],
  assignments = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onPracticeInAi,
  onOpenImportExport,
  onOpenStudentDevBook,
  canEditGrades,
  initialCourseId,
  initialStudentId,
  initialTab,
  embeddedInStudentManagement = false,
  onSwitchToStudentRegistry,
  lang = 'th',
}) => {
  const isPersonalGradeViewer = currentRole === 'student' || currentRole === 'parent';
  const effectiveCanEditGrades =
    typeof canEditGrades === 'boolean'
      ? canEditGrades
      : ['super_admin', 'admin', 'teacher'].includes(currentRole);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    if (initialCourseId && courses.some((c) => c.id === initialCourseId)) return initialCourseId;
    return courses[0]?.id || '';
  });
  const [isUpdatingGradingMode, setIsUpdatingGradingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | 'gradebook'
    | 'indicators'
    | 'moe_student_hub'
    | 'pp5'
    | 'pp5_core_summary'
    | 'pp6'
    | 'core_report_card'
    | 'qualitative_summary'
    | 'pp3_online'
    | 'onet_niets'
  >(() => {
    if (isPersonalGradeViewer) return 'pp6';
    if (initialTab === 'pp6' || initialTab === 'core_report_card') return 'moe_student_hub';
    return initialTab || 'gradebook';
  });
  const [hubDocViewOverride, setHubDocViewOverride] = useState<MoeDocViewSelection | undefined>(() => {
    if (initialTab === 'pp6') return 'pp6';
    if (initialTab === 'core_report_card') return 'core_report_card';
    return undefined;
  });
  const [pendingDeleteGrade, setPendingDeleteGrade] = useState<{ grade: GradeRecord; studentName: string } | null>(null);
  const [isDeletingGrade, setIsDeletingGrade] = useState(false);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [courseTeacherFilter, setCourseTeacherFilter] = useState<string>('all');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [gradeStatusFilter, setGradeStatusFilter] = useState<'all' | 'excellent' | 'pass' | 'at_risk'>('all');
  const [selectedStudentIdForPp6, setSelectedStudentIdForPp6] = useState<string>(students[0]?.id || '');
  const [pp3LevelFilter, setPp3LevelFilter] = useState<'all' | 'p6' | 'm3' | 'm6'>('all');
  const [pp3RoomFilter, setPp3RoomFilter] = useState<string>('all');
  const [onetLevelFilter, setOnetLevelFilter] = useState<'p6' | 'm3' | 'm6'>('m3');
  const [onetRoomFilter, setOnetRoomFilter] = useState<string>('all');
  const [addStudentSearchTerm, setAddStudentSearchTerm] = useState('');
  const [gradePage, setGradePage] = useState(0);
  const [pp5Page, setPp5Page] = useState(0);
  const [pp6CoursePage, setPp6CoursePage] = useState(0);
  const [gradeRoomFilter, setGradeRoomFilter] = useState('all');
  const [gradeLevelFilter, setGradeLevelFilter] = useState('all');
  const [gradeEligibilityFilter, setGradeEligibilityFilter] = useState<'all' | 'eligible' | 'at_risk'>('all');
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
  const [gradeAlertBanner, setGradeAlertBanner] = useState<{ message: string; detail?: string } | null>(null);
  const [showAddGradeForm, setShowAddGradeForm] = useState(false);
  const [showBatchPastePanel, setShowBatchPastePanel] = useState(false);
  const [batchPasteField, setBatchPasteField] = useState<'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore'>('midtermScore');
  const [batchPasteText, setBatchPasteText] = useState('');
  const [newGradeStudentId, setNewGradeStudentId] = useState('');
  const [newMidtermScore, setNewMidtermScore] = useState(0);
  const [newFinalScore, setNewFinalScore] = useState(0);
  const [newAssignmentScore, setNewAssignmentScore] = useState(0);
  const [newQuizScore, setNewQuizScore] = useState(0);
  const [histogramScope, setHistogramScope] = useState<HistogramScope>('course');
  const [histogramChartMode, setHistogramChartMode] = useState<ChartViewMode>('score_bins');
  const [histogramDeptFilter, setHistogramDeptFilter] = useState<string>('all');
  const [showWeightConfigPanel, setShowWeightConfigPanel] = useState<boolean>(false);
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const weightStorageKey = `eduverse_obec_weights_v1_${school?.id || 'default'}`;
  const [courseWeightsMap, setCourseWeightsMap] = useState<Record<string, CourseScoreWeights>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(weightStorageKey) : null;
      return raw ? (JSON.parse(raw) as Record<string, CourseScoreWeights>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(weightStorageKey, JSON.stringify(courseWeightsMap));
      }
    } catch {
      // ignore storage quota errors
    }
  }, [courseWeightsMap, weightStorageKey]);

  const pendingNotifyRef = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; latestGrade: GradeRecord }>>(
    new Map()
  );
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialCourseId && courses.some((c) => c.id === initialCourseId)) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId, courses]);

  useEffect(() => {
    if (initialTab && !isPersonalGradeViewer) {
      if (initialTab === 'pp6') {
        setHubDocViewOverride('pp6');
        setActiveTab('moe_student_hub');
      } else if (initialTab === 'core_report_card') {
        setHubDocViewOverride('core_report_card');
        setActiveTab('moe_student_hub');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, isPersonalGradeViewer]);

  useEffect(() => {
    if (initialStudentId && students.some((s) => s.id === initialStudentId)) {
      setSelectedStudentIdForPp6(initialStudentId);
    }
  }, [initialStudentId, students]);

  useEffect(() => {
    if (isPersonalGradeViewer && activeTab !== 'gradebook' && activeTab !== 'pp6') {
      setActiveTab('pp6');
    }
  }, [isPersonalGradeViewer, activeTab]);

  useEffect(() => {
    const timersMap = pendingNotifyRef.current;
    return () => {
      timersMap.forEach((entry) => clearTimeout(entry.timer));
      timersMap.clear();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const courseGrades = grades.filter((g) => g.courseId === selectedCourseId);
  const gradedStudentIdsInCourse = new Set(courseGrades.map((g) => g.studentId));
  const studentsWithoutGradeInCourse = students
    .filter((s) => !gradedStudentIdsInCourse.has(s.id))
    .sort((a, b) =>
      `${a.gradeLevel} ${a.room} ${a.studentIdNumber}`.localeCompare(
        `${b.gradeLevel} ${b.room} ${b.studentIdNumber}`,
        'th'
      )
    );
  const filteredAddCandidates = studentsWithoutGradeInCourse.filter((s) => {
    const q = addStudentSearchTerm.trim().toLowerCase();
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
  const courseTeacherOptions = buildCourseTeacherOptions(courses, teachers);
  const loggedInTeacherFilterKey = resolveTeacherFilterKeyForUser(currentUser, teachers, courseTeacherOptions);
  const loggedInTeacherOption = loggedInTeacherFilterKey
    ? courseTeacherOptions.find((opt) => opt.key === loggedInTeacherFilterKey)
    : undefined;
  const autoScopedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const scopeKey = `${school?.id || ''}::${currentUser?.id || ''}::${currentRole}`;
    if (currentRole !== 'teacher' || !loggedInTeacherFilterKey) {
      return;
    }
    if (autoScopedSessionRef.current === scopeKey) return;
    autoScopedSessionRef.current = scopeKey;
    setCourseTeacherFilter(loggedInTeacherFilterKey);
    const firstOwnCourse = courses.find((course) =>
      courseMatchesTeacherFilter(course, loggedInTeacherFilterKey, courseTeacherOptions)
    );
    if (firstOwnCourse) {
      setSelectedCourseId(firstOwnCourse.id);
    }
    setGradePage(0);
    setPp5Page(0);
  }, [school?.id, currentUser?.id, currentRole, loggedInTeacherFilterKey, courses, courseTeacherOptions]);

  const filteredCourses = courses.filter((course) => {
    if (!courseMatchesTeacherFilter(course, courseTeacherFilter, courseTeacherOptions)) return false;
    const search = courseSearchTerm.trim().toLocaleLowerCase();
    return !search || [course.code, course.titleTh, course.titleEn, course.teacherName, course.department, course.room]
      .some((value) => value?.toLocaleLowerCase().includes(search));
  });
  const courseSelectOptions =
    courseTeacherFilter === 'all' &&
    selectedCourse &&
    !filteredCourses.some((course) => course.id === selectedCourse.id)
      ? [selectedCourse, ...filteredCourses]
      : filteredCourses;
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const gradebookRows = courseGrades.flatMap((grade) => {
    const student = studentsById.get(grade.studentId);
    if (!student) return [];
    return [{
      grade,
      student,
      eligibility: calculateStudentCourseEligibility({
        student,
        course: selectedCourse,
        timetableSlots,
        attendance,
        periodAttendance,
      }),
    }];
  });
  const gradeRoomOptions = Array.from(new Set(gradebookRows.map(({ student }) => student.room).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const gradeLevelOptions = Array.from(new Set(gradebookRows.map(({ student }) => student.gradeLevel).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const normalizedStudentSearch = studentSearchTerm.trim().toLowerCase();
  const filteredGradebookRows = gradebookRows.filter(({ grade, student, eligibility }) => {
    if (gradeRoomFilter !== 'all' && student.room !== gradeRoomFilter) return false;
    if (gradeLevelFilter !== 'all' && student.gradeLevel !== gradeLevelFilter) return false;
    if (gradeEligibilityFilter === 'at_risk' && !eligibility.isAtRiskMs) return false;
    if (gradeEligibilityFilter === 'eligible' && eligibility.isAtRiskMs) return false;

    if (gradeStatusFilter !== 'all') {
      const disp = resolveEffectiveGrade(grade, selectedCourse, systemConfig.gradingSystem, eligibility.isAtRiskMs);
      const isRisk =
        disp.letter === '0' ||
        disp.letter === 'F' ||
        disp.letter === 'ร' ||
        disp.letter === 'มส.' ||
        disp.letter === 'มผ' ||
        grade.totalScore < 50;
      const isExcellent = !isRisk && (disp.point >= 3.5 || grade.totalScore >= 75 || disp.letter === 'ผ');
      if (gradeStatusFilter === 'excellent' && !isExcellent) return false;
      if (gradeStatusFilter === 'pass' && isRisk) return false;
      if (gradeStatusFilter === 'at_risk' && !isRisk) return false;
    }

    if (normalizedStudentSearch) {
      const matched = [
        student.studentIdNumber,
        student.nationalId,
        `${student.firstNameTh} ${student.lastNameTh}`,
        `${student.firstNameEn} ${student.lastNameEn}`,
        student.room,
        student.gradeLevel,
      ].some((value) => (value || '').toLowerCase().includes(normalizedStudentSearch));
      if (!matched) return false;
    }

    return true;
  });
  const courseStudents = gradebookRows.map(({ student }) => student);
  const courseStage = detectCourseEducationStage(selectedCourse, courseStudents);
  const isPrimaryCourse = isPrimaryStage(courseStage);
  const isEarlyPrimaryCourse = courseStage === 'primary_early';
  const courseIsActivity = isActivityCourse(selectedCourse);

  const pp3LevelStudents = students.filter((student) => matchesEducationLevelFilter(student.gradeLevel, pp3LevelFilter));
  const pp3RoomOptions = Array.from(new Set(pp3LevelStudents.map((s) => s.room).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const pp3EligibleStudents = pp3LevelStudents.filter((student) => {
    if (pp3RoomFilter !== 'all' && student.room !== pp3RoomFilter) return false;
    if (!normalizedStudentSearch) return true;
    return [
      student.studentIdNumber,
      student.nationalId,
      `${student.firstNameTh} ${student.lastNameTh}`,
      `${student.firstNameEn} ${student.lastNameEn}`,
      student.room,
      student.gradeLevel,
    ].some((value) => (value || '').toLowerCase().includes(normalizedStudentSearch));
  });

  const onetLevelStudents = students.filter((student) => matchesEducationLevelFilter(student.gradeLevel, onetLevelFilter));
  const onetRoomOptions = Array.from(new Set(onetLevelStudents.map((s) => s.room).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'th'));
  const onetEligibleStudents = onetLevelStudents.filter((student) => {
    if (onetRoomFilter !== 'all' && student.room !== onetRoomFilter) return false;
    if (!normalizedStudentSearch) return true;
    return [
      student.studentIdNumber,
      student.nationalId,
      `${student.firstNameTh} ${student.lastNameTh}`,
      `${student.firstNameEn} ${student.lastNameEn}`,
      student.room,
      student.gradeLevel,
    ].some((value) => (value || '').toLowerCase().includes(normalizedStudentSearch));
  });

  const onetRows = onetEligibleStudents.map((stu, idx) => {
    const summary = calculateStudentAcademicSummary({
      student: stu,
      courses,
      grades,
      gradingSystem: systemConfig.gradingSystem,
    });
    const effectiveGpa = summary.hasRecordedGrades ? (summary.gpax ?? summary.annualGradeAverage ?? 0) : 0;
    const stuGrades = grades.filter((g) => g.studentId === stu.id);
    const findSubjectScore = (keywords: string[], fallback: number) => {
      const matched = stuGrades.find((g) => {
        const c = courses.find((cr) => cr.id === g.courseId);
        const title = `${c?.titleTh || ''} ${c?.titleEn || ''} ${c?.department || ''}`.toLowerCase();
        return keywords.some((kw) => title.includes(kw));
      });
      return matched ? Math.round(matched.totalScore) : fallback;
    };
    const baseFromGpa = effectiveGpa > 0 ? effectiveGpa : 2.5;
    const thScore = findSubjectScore(['ไทย', 'thai'], Math.min(95, Math.round(52 + baseFromGpa * 10)));
    const mathScore = findSubjectScore(['คณิต', 'math'], Math.min(95, Math.round(46 + baseFromGpa * 11)));
    const sciScore = findSubjectScore(['วิทย', 'science'], Math.min(95, Math.round(50 + baseFromGpa * 10.5)));
    const engScore = findSubjectScore(['อังกฤษ', 'english'], Math.min(95, Math.round(48 + baseFromGpa * 11)));
    const avgNumber = Number(((thScore + mathScore + sciScore + engScore) / 4).toFixed(1));
    return {
      stu,
      idx,
      nationalId: stu.nationalId || `1100${idx.toString().padStart(9, '0')}`,
      seatNo: `67${(idx + 1).toString().padStart(6, '0')}`,
      thScore,
      mathScore,
      sciScore,
      engScore,
      avgNumber,
    };
  });
  const onetOverallAverage =
    onetRows.length > 0
      ? (onetRows.reduce((sum, row) => sum + row.avgNumber, 0) / onetRows.length).toFixed(1)
      : null;
  const gradePageSize = 15;
  const pp5PageSize = 15;
  const pp6CoursePageSize = 5;
  const gradePageCount = Math.max(1, Math.ceil(filteredGradebookRows.length / gradePageSize));
  const pp5PageCount = Math.max(1, Math.ceil(courseGrades.length / pp5PageSize));
  const pp6CoursePageCount = Math.max(1, Math.ceil(courses.length / pp6CoursePageSize));
  const currentGradePage = Math.min(gradePage, gradePageCount - 1);
  const currentPp5Page = Math.min(pp5Page, pp5PageCount - 1);
  const currentPp6CoursePage = Math.min(pp6CoursePage, pp6CoursePageCount - 1);

  const renderPageControls = (
    page: number,
    totalItems: number,
    pageSize: number,
    setPage: (page: number) => void,
    label: string,
    isLight = false
  ) => {
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
    if (pageCount <= 1) return null;

    return (
      <nav aria-label={label} className="flex items-center justify-between gap-3 text-xs print:hidden">
        <button
          type="button"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer ${
            isLight
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
          }`}
        >
          ก่อนหน้า
        </button>
        <span aria-live="polite" className={`text-[11px] font-medium ${isLight ? 'text-slate-700' : 'text-[var(--color-text-muted)]'}`}>
          หน้า {page + 1} / {pageCount} · {totalItems} รายการ
        </span>
        <button
          type="button"
          onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer ${
            isLight
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
          }`}
        >
          ถัดไป
        </button>
      </nav>
    );
  };

  const activeCourseWeights: CourseScoreWeights =
    (selectedCourseId && courseWeightsMap[selectedCourseId]) || DEFAULT_SCORE_WEIGHTS;

  const isDefaultCourseWeights =
    activeCourseWeights.midterm === DEFAULT_SCORE_WEIGHTS.midterm &&
    activeCourseWeights.final === DEFAULT_SCORE_WEIGHTS.final &&
    activeCourseWeights.assignment === DEFAULT_SCORE_WEIGHTS.assignment &&
    activeCourseWeights.quiz === DEFAULT_SCORE_WEIGHTS.quiz;

  const weightSum =
    activeCourseWeights.midterm +
    activeCourseWeights.final +
    activeCourseWeights.assignment +
    activeCourseWeights.quiz;

  const normalizedWeightPercents = (() => {
    const safeSum = Math.max(1, weightSum);
    return {
      midterm: Math.round((activeCourseWeights.midterm / safeSum) * 100),
      final: Math.round((activeCourseWeights.final / safeSum) * 100),
      assignment: Math.round((activeCourseWeights.assignment / safeSum) * 100),
      quiz: Math.round((activeCourseWeights.quiz / safeSum) * 100),
      duringTerm: Math.round(
        ((activeCourseWeights.midterm + activeCourseWeights.assignment + activeCourseWeights.quiz) /
          safeSum) *
          100
      ),
    };
  })();

  const updateActiveCourseWeights = (next: CourseScoreWeights) => {
    if (!selectedCourseId) return;
    setCourseWeightsMap((prev) => ({
      ...prev,
      [selectedCourseId]: {
        midterm: Math.max(0, Math.min(100, Math.round(next.midterm))),
        final: Math.max(0, Math.min(100, Math.round(next.final))),
        assignment: Math.max(0, Math.min(100, Math.round(next.assignment))),
        quiz: Math.max(0, Math.min(100, Math.round(next.quiz))),
      },
    }));
  };

  const computeWeightedTotal = (
    mid: number,
    fin: number,
    assign: number,
    quiz: number,
    weights: CourseScoreWeights = activeCourseWeights
  ): number => {
    if (
      weights.midterm === 30 &&
      weights.final === 40 &&
      weights.assignment === 20 &&
      weights.quiz === 10
    ) {
      return clampScore(mid + fin + assign + quiz, 100);
    }
    const safeTotal = Math.max(1, weights.midterm + weights.final + weights.assignment + weights.quiz);
    const weighted =
      ((mid / 30) * weights.midterm +
        (fin / 40) * weights.final +
        (assign / 20) * weights.assignment +
        (quiz / 10) * weights.quiz) *
      (100 / safeTotal);
    return clampScore(Math.round(weighted), 100);
  };

  const computeLiveObecGrade = (grade: GradeRecord) => {
    const liveTotal = computeWeightedTotal(
      grade.midtermScore,
      grade.finalScore,
      grade.assignmentScore,
      grade.quizScore,
      activeCourseWeights
    );
    const simulatedRecord: GradeRecord = { ...grade, totalScore: liveTotal };
    const resolved = resolveEffectiveGrade(
      simulatedRecord,
      selectedCourse,
      systemConfig.gradingSystem,
      false
    );
    const savedResolved = resolveEffectiveGrade(
      grade,
      selectedCourse,
      systemConfig.gradingSystem,
      false
    );
    const hasDiff =
      liveTotal !== grade.totalScore ||
      resolved.letter !== grade.letterGrade ||
      resolved.point !== grade.gradePoint;

    return {
      totalScore: liveTotal,
      letter: resolved.letter,
      point: resolved.point,
      isSpecial: resolved.isSpecial,
      isActivity: resolved.isActivity,
      savedLetter: savedResolved.letter,
      hasDiff,
    };
  };

  const weightSimulationSummary = (() => {
    const rows = filteredGradebookRows;
    let savedGpaSum = 0;
    let liveGpaSum = 0;
    let gpaCount = 0;
    let livePassCount = 0;
    let evalCount = 0;
    let changedCount = 0;

    rows.forEach(({ grade }) => {
      const live = computeLiveObecGrade(grade);
      if (live.hasDiff) changedCount += 1;

      if (live.letter !== 'ร' && live.letter !== 'มส.') {
        evalCount += 1;
        if (live.letter === 'ผ' || live.point >= 1.0) {
          livePassCount += 1;
        }
      }

      if (!live.isSpecial && !live.isActivity) {
        const savedResolved = resolveEffectiveGrade(
          grade,
          selectedCourse,
          systemConfig.gradingSystem,
          false
        );
        savedGpaSum += savedResolved.point;
        liveGpaSum += live.point;
        gpaCount += 1;
      }
    });

    const savedAvgGpa = gpaCount > 0 ? Math.round((savedGpaSum / gpaCount) * 100) / 100 : 0;
    const liveAvgGpa = gpaCount > 0 ? Math.round((liveGpaSum / gpaCount) * 100) / 100 : 0;
    const gpaDelta = Math.round((liveAvgGpa - savedAvgGpa) * 100) / 100;
    const passRate = evalCount > 0 ? Math.round((livePassCount / evalCount) * 1000) / 10 : 100;

    return {
      savedAvgGpa,
      liveAvgGpa,
      gpaDelta,
      passRate,
      changedCount,
      totalRows: rows.length,
    };
  })();

  const handleApplyWeightsToCourseGrades = () => {
    if (!effectiveCanEditGrades || !selectedCourse) return;
    let updatedCount = 0;
    courseGrades.forEach((grade) => {
      const live = computeLiveObecGrade(grade);
      if (live.hasDiff) {
        onUpdateGrade(grade.id, {
          totalScore: live.totalScore,
          letterGrade: live.letter,
          gradePoint: live.point,
        });
        updatedCount += 1;
      }
    });
    if (updatedCount > 0) {
      showAlertToast(
        `อัปเดตผลตัดเกรดตามค่าน้ำหนักใหม่ในวิชา ${selectedCourse.code} สำเร็จ ${updatedCount} คน`,
        `สัดส่วน ${activeCourseWeights.midterm}:${activeCourseWeights.final}:${activeCourseWeights.assignment}:${activeCourseWeights.quiz}`
      );
    } else {
      showAlertToast('ผลตัดเกรดทุกรายการตรงกับค่าน้ำหนักปัจจุบันแล้ว');
    }
  };

  const handleNormalizeWeightsTo100 = () => {
    const safeSum = Math.max(1, weightSum);
    const m = Math.round((activeCourseWeights.midterm / safeSum) * 100);
    const f = Math.round((activeCourseWeights.final / safeSum) * 100);
    const a = Math.round((activeCourseWeights.assignment / safeSum) * 100);
    const q = Math.max(0, 100 - m - f - a);
    updateActiveCourseWeights({ midterm: m, final: f, assignment: a, quiz: q });
  };

  const getGradeDisplay = (grade: GradeRecord) =>
    resolveEffectiveGrade(grade, selectedCourse, systemConfig.gradingSystem, false);

  const showAlertToast = (message: string, detail?: string) => {
    setGradeAlertBanner({ message, detail });
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setGradeAlertBanner(null);
    }, 4500);
  };

  const handleDownloadGradeDistributionPdf = () => {
    const courseDeptMap = new Map(courses.map((c) => [c.id, c.department?.trim() || '']));
    const scopedGradesForPdf =
      histogramScope === 'course'
        ? filteredGradebookRows.map((row) => row.grade)
        : histogramDeptFilter === 'all'
        ? grades
        : grades.filter((g) => courseDeptMap.get(g.courseId) === histogramDeptFilter);

    const { fileName } = downloadGradeDistributionReportPdf({
      courses,
      grades: scopedGradesForPdf,
      students,
      systemConfig,
      school,
      selectedCourse,
      gradingSystem: systemConfig.gradingSystem,
      scope: histogramScope,
      chartMode: histogramChartMode,
      departmentFilter: histogramDeptFilter,
      roomFilter: gradeRoomFilter,
      levelFilter: gradeLevelFilter,
      eligibilityFilter: gradeEligibilityFilter,
      lang,
    });

    showAlertToast(
      lang === 'th' ? 'ดาวน์โหลดรายงานการกระจายเกรด PDF สำเร็จ' : 'Grade distribution PDF downloaded',
      fileName
    );
  };

  const triggerGradeAlertNow = async (grade: GradeRecord, isNewRecord = false, force = false) => {
    if (!force && !autoNotifyEnabled) return;
    const student = studentsById.get(grade.studentId);
    if (!student) return;

    if (onNotifyGradeChange) {
      await onNotifyGradeChange(grade, isNewRecord);
    } else {
      await dispatchGradeAlert({
        student,
        course: selectedCourse,
        grade,
        systemConfig,
        schoolId: school?.id || grade.schoolId || '',
        isNewRecord,
        isDemoMode: true,
      });
    }

    const studentLabel = `${student.firstNameTh} ${student.lastNameTh}`.trim();
    const courseLabel = selectedCourse?.code || grade.courseId;
    const stagePrimary = isPrimaryStage(detectCourseEducationStage(selectedCourse, [student]));
    const detail = stagePrimary
      ? `${courseLabel} • คะแนนรวม ${grade.totalScore}/100 (${grade.totalScore}%)`
      : `${courseLabel} • คะแนนรวม ${grade.totalScore}/100 • เกรด ${grade.letterGrade}`;
    showAlertToast(
      `ส่งแจ้งเตือนผลการเรียนไปยัง ${studentLabel} และผู้ปกครองแล้ว`,
      detail
    );
  };

  const scheduleDebouncedGradeAlert = (updatedGrade: GradeRecord) => {
    if (!autoNotifyEnabled) return;
    const existing = pendingNotifyRef.current.get(updatedGrade.id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      pendingNotifyRef.current.delete(updatedGrade.id);
      void triggerGradeAlertNow(updatedGrade, false);
    }, 1400);
    pendingNotifyRef.current.set(updatedGrade.id, { timer, latestGrade: updatedGrade });
  };

  const flushPendingGradeAlert = (gradeId: string) => {
    const pending = pendingNotifyRef.current.get(gradeId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingNotifyRef.current.delete(gradeId);
    void triggerGradeAlertNow(pending.latestGrade, false);
  };

  const handleScoreChange = (
    grade: GradeRecord,
    field: 'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore',
    rawVal: number
  ) => {
    if (!effectiveCanEditGrades) return;
    const maxMap = {
      midtermScore: 30,
      finalScore: 40,
      assignmentScore: 20,
      quizScore: 10,
    } as const;
    const clampedVal = clampScore(rawVal, maxMap[field]);
    const updated = { ...grade, [field]: clampedVal };
    const total = computeWeightedTotal(
      field === 'midtermScore' ? clampedVal : updated.midtermScore,
      field === 'finalScore' ? clampedVal : updated.finalScore,
      field === 'assignmentScore' ? clampedVal : updated.assignmentScore,
      field === 'quizScore' ? clampedVal : updated.quizScore,
      activeCourseWeights
    );

    if (courseIsActivity || grade.letterGrade === 'ผ' || grade.letterGrade === 'มผ') {
      const nextLetter = total >= 50 ? 'ผ' : 'มผ';
      const nextGrade: GradeRecord = {
        ...updated,
        totalScore: total,
        letterGrade: nextLetter,
        gradePoint: 0,
      };
      onUpdateGrade(grade.id, {
        [field]: clampedVal,
        totalScore: total,
        letterGrade: nextLetter,
        gradePoint: 0,
      });
      scheduleDebouncedGradeAlert(nextGrade);
      return;
    }

    if (grade.letterGrade === 'ร' || grade.letterGrade === 'มส.') {
      const nextGrade: GradeRecord = {
        ...updated,
        totalScore: total,
        letterGrade: grade.letterGrade,
        gradePoint: 0,
      };
      onUpdateGrade(grade.id, {
        [field]: clampedVal,
        totalScore: total,
        letterGrade: grade.letterGrade,
        gradePoint: 0,
      });
      scheduleDebouncedGradeAlert(nextGrade);
      return;
    }

    const { letter, point } = calculateGrade(total, systemConfig.gradingSystem);
    const nextGrade: GradeRecord = {
      ...updated,
      totalScore: total,
      letterGrade: letter,
      gradePoint: point,
    };
    onUpdateGrade(grade.id, {
      [field]: clampedVal,
      totalScore: total,
      letterGrade: letter,
      gradePoint: point,
    });
    scheduleDebouncedGradeAlert(nextGrade);
  };

  const courseAssignmentIds = new Set(
    selectedCourse
      ? assignments.filter((a) => a.courseId === selectedCourse.id).map((a) => a.id)
      : []
  );
  const courseCodeNorm = selectedCourse?.code.trim().toLowerCase() || '';
  const gradedCourseSubmissions = selectedCourse
    ? homeworkSubmissions.filter(
        (sub) =>
          sub.status === 'graded' &&
          typeof sub.score === 'number' &&
          sub.maxScore > 0 &&
          (courseAssignmentIds.has(sub.assignmentId) ||
            (sub.courseCode && sub.courseCode.trim().toLowerCase() === courseCodeNorm))
      )
    : [];
  const homeworkSyncMap = new Map<string, number>();
  if (gradedCourseSubmissions.length > 0) {
    const totalsByStudent = new Map<string, { earned: number; max: number }>();
    gradedCourseSubmissions.forEach((sub) => {
      const acc = totalsByStudent.get(sub.studentId) || { earned: 0, max: 0 };
      acc.earned += Number(sub.score || 0);
      acc.max += Number(sub.maxScore || 0);
      totalsByStudent.set(sub.studentId, acc);
    });
    totalsByStudent.forEach((acc, stuId) => {
      if (acc.max > 0) {
        homeworkSyncMap.set(stuId, clampScore(Math.round((acc.earned / acc.max) * 20), 20));
      }
    });
  }
  const homeworkSyncCandidates = gradebookRows.filter(({ grade, student }) => {
    const syncedScore = homeworkSyncMap.get(student.id);
    return typeof syncedScore === 'number' && syncedScore !== grade.assignmentScore;
  });

  const handleSyncHomeworkScores = () => {
    if (!selectedCourse || homeworkSyncCandidates.length === 0) return;
    homeworkSyncCandidates.forEach(({ grade, student }) => {
      const nextAssignment = homeworkSyncMap.get(student.id);
      if (typeof nextAssignment === 'number') {
        handleScoreChange(grade, 'assignmentScore', nextAssignment);
      }
    });
    showAlertToast(
      `ซิงค์คะแนนการบ้านเข้าวิชา ${selectedCourse.code} สำเร็จ ${homeworkSyncCandidates.length} คน`,
      'คำนวณจากชิ้นงานที่ตรวจแล้วปรับสัดส่วนเป็นเต็ม 20 คะแนน'
    );
  };

  const batchMaxMap: Record<'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore', number> = {
    midtermScore: 30,
    finalScore: 40,
    assignmentScore: 20,
    quizScore: 10,
  };

  const parsedBatchUpdates = (() => {
    const lines = batchPasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const maxScore = batchMaxMap[batchPasteField];
    const updates: { grade: GradeRecord; student: Student; score: number }[] = [];
    const seenGradeIds = new Set<string>();
    const rowByStudentNum = new Map(
      gradebookRows.map((row) => [row.student.studentIdNumber.trim().toLowerCase(), row] as const)
    );

    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,;]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const key = parts[0].toLowerCase();
        const rawScore = Number(parts[parts.length - 1]);
        const match = rowByStudentNum.get(key) || gradebookRows.find(
          (r) => `${r.student.firstNameTh} ${r.student.lastNameTh}`.toLowerCase() === key
        );
        if (match && Number.isFinite(rawScore) && !seenGradeIds.has(match.grade.id)) {
          seenGradeIds.add(match.grade.id);
          updates.push({
            grade: match.grade,
            student: match.student,
            score: clampScore(rawScore, maxScore),
          });
        }
      } else if (parts.length === 1) {
        const rawScore = Number(parts[0]);
        const targetRow = filteredGradebookRows[idx];
        if (targetRow && Number.isFinite(rawScore) && !seenGradeIds.has(targetRow.grade.id)) {
          seenGradeIds.add(targetRow.grade.id);
          updates.push({
            grade: targetRow.grade,
            student: targetRow.student,
            score: clampScore(rawScore, maxScore),
          });
        }
      }
    });
    return updates;
  })();

  const handleApplyBatchPaste = () => {
    if (parsedBatchUpdates.length === 0) return;
    parsedBatchUpdates.forEach(({ grade, score }) => {
      handleScoreChange(grade, batchPasteField, score);
    });
    const fieldLabels = {
      midtermScore: 'กลางภาค',
      finalScore: 'ปลายภาค',
      assignmentScore: 'การบ้าน/ชิ้นงาน',
      quizScore: 'แบบทดสอบย่อย',
    } as const;
    showAlertToast(
      `วางคะแนนช่อง "${fieldLabels[batchPasteField]}" สำเร็จ ${parsedBatchUpdates.length} คน`,
      selectedCourse ? `${selectedCourse.code} • คำนวณเกรดรวมให้อัตโนมัติแล้ว` : undefined
    );
    setBatchPasteText('');
    setShowBatchPastePanel(false);
  };

  const handleSpecialStatusChange = (grade: GradeRecord, status: 'auto' | 'ร' | 'มส.' | 'ผ' | 'มผ') => {
    const existingPending = pendingNotifyRef.current.get(grade.id);
    if (existingPending) {
      clearTimeout(existingPending.timer);
      pendingNotifyRef.current.delete(grade.id);
    }

    const liveTotal = computeWeightedTotal(
      grade.midtermScore,
      grade.finalScore,
      grade.assignmentScore,
      grade.quizScore,
      activeCourseWeights
    );
    let nextLetter = grade.letterGrade;
    let nextPoint = grade.gradePoint;

    if (status === 'auto') {
      if (courseIsActivity) {
        nextLetter = liveTotal >= 50 ? 'ผ' : 'มผ';
        nextPoint = 0;
      } else {
        const { letter, point } = calculateGrade(liveTotal, systemConfig.gradingSystem);
        nextLetter = letter;
        nextPoint = point;
      }
    } else {
      nextLetter = status;
      nextPoint = 0;
    }

    onUpdateGrade(grade.id, { totalScore: liveTotal, letterGrade: nextLetter, gradePoint: nextPoint });
    const nextGrade: GradeRecord = { ...grade, totalScore: liveTotal, letterGrade: nextLetter, gradePoint: nextPoint };
    void triggerGradeAlertNow(nextGrade, false);
  };

  const handleCreateGradeRecord = (event: React.FormEvent) => {
    event.preventDefault();
    if (!effectiveCanEditGrades || !selectedCourse || !newGradeStudentId || !onAddGrade) return;
    const midterm = clampScore(newMidtermScore, 30);
    const final = clampScore(newFinalScore, 40);
    const assignment = clampScore(newAssignmentScore, 20);
    const quiz = clampScore(newQuizScore, 10);
    const total = computeWeightedTotal(midterm, final, assignment, quiz, activeCourseWeights);
    const graded = courseIsActivity
      ? { letter: total >= 50 ? 'ผ' : 'มผ', point: 0 }
      : calculateGrade(total, systemConfig.gradingSystem);

    const newRecord: GradeRecord = {
      id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      schoolId: school?.id || '',
      studentId: newGradeStudentId,
      courseId: selectedCourse.id,
      academicYear: systemConfig.academicYear || school?.academicYear || '2568',
      semester: systemConfig.currentSemester || school?.currentSemester || '1',
      midtermScore: midterm,
      finalScore: final,
      assignmentScore: assignment,
      quizScore: quiz,
      totalScore: total,
      letterGrade: graded.letter,
      gradePoint: graded.point,
    };

    onAddGrade(newRecord, { notify: autoNotifyEnabled });
    const stu = studentsById.get(newGradeStudentId);
    if (stu) {
      showAlertToast(
        autoNotifyEnabled
          ? `บันทึกคะแนนใหม่และแจ้งเตือนไปยัง ${stu.firstNameTh} ${stu.lastNameTh} และผู้ปกครองแล้ว`
          : `บันทึกคะแนนใหม่ของ ${stu.firstNameTh} ${stu.lastNameTh} แล้ว (ปิดแจ้งเตือนอัตโนมัติ)`,
        `${selectedCourse.code} • คะแนนรวม ${total}/100 (${total}%)`
      );
    }
    setShowAddGradeForm(false);
    setNewGradeStudentId('');
    setNewMidtermScore(0);
    setNewFinalScore(0);
    setNewAssignmentScore(0);
    setNewQuizScore(0);
  };

  const handleExportCSV = () => {
    if (!selectedCourse) return;
    const cycleLabel = isPrimaryCourse ? 'รายปี (ป.1-ป.6)' : 'รายภาคเรียน (ม.1-ม.6)';
    const learningArea = resolveMoeLearningArea(selectedCourse);
    const qualMap = loadQualitativeAssessments(
      school?.id || students[0]?.schoolId || 'default',
      systemConfig.academicYear || '2569',
      systemConfig.currentSemester || '1'
    );
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล (ไทย)',
      'Name (English)',
      'ห้องเรียน',
      'กลุ่มสาระการเรียนรู้',
      'รอบการประเมิน',
      'มาเรียน (ครั้ง)',
      'สาย (ครั้ง)',
      'ลาป่วย/ลากิจ (ครั้ง)',
      'ขาด (ครั้ง)',
      'เวลาเรียน (%)',
      'สถานะสิทธิ์สอบ (80%)',
      'กลางภาค (30)',
      'ปลายภาค (40)',
      'การบ้าน/ชิ้นงาน (20)',
      'แบบทดสอบย่อย (10)',
      'คะแนนรวม (100)',
      'ร้อยละ (%)',
      isPrimaryCourse ? 'ระดับพัฒนาการ (Feedback)' : 'ผลการเรียน (ปพ.5)',
      isPrimaryCourse ? 'ผลประเมินรายปี (ศธ.)' : 'ค่าระดับ (0-4)',
      'คุณลักษณะอันพึงประสงค์',
      'การอ่าน คิดวิเคราะห์ และเขียน',
      'สมรรถนะสำคัญ 5 ด้าน',
    ];

    const rows = courseGrades.map((g) => {
      const stu = students.find((s) => s.id === g.studentId);
      const disp = getGradeDisplay(g);
      const feedback = getRawScoreFeedback(g.totalScore);
      const att = stu
        ? calculateDetailedCourseAttendance({
            student: stu,
            course: selectedCourse,
            timetableSlots,
            attendance,
            periodAttendance,
          })
        : null;
      const qual = stu ? summarizeStudentQualitative(getStudentQualitativeRecord(qualMap, stu.id)) : null;
      return [
        `"${stu?.studentIdNumber || ''}"`,
        `"${stu?.firstNameTh || ''} ${stu?.lastNameTh || ''}"`,
        `"${stu?.firstNameEn || ''} ${stu?.lastNameEn || ''}"`,
        `"${stu?.room || ''}"`,
        `"${learningArea.nameTh}"`,
        `"${cycleLabel}"`,
        att ? att.presentCount : 0,
        att ? att.lateCount : 0,
        att ? att.sickCount + att.leaveCount : 0,
        att ? att.absentCount : 0,
        att ? `${att.attendancePercent}%` : '95%',
        `"${att?.isAtRiskMs ? 'เสี่ยง มส. (<80%)' : 'มีสิทธิ์สอบ'}"`,
        g.midtermScore,
        g.finalScore,
        g.assignmentScore,
        g.quizScore,
        g.totalScore,
        `${g.totalScore}%`,
        `"${isPrimaryCourse ? (disp.isSpecial ? disp.letter : `${feedback.labelTh} (${feedback.labelEn})`) : disp.letter}"`,
        isPrimaryCourse ? `"${disp.letter}"` : (disp.isSpecial ? '-' : disp.point.toFixed(1)),
        `"${qual?.attrLabel || 'ดีเยี่ยม (๓)'}"`,
        `"${qual?.readingLabel || 'ดีเยี่ยม (๓)'}"`,
        `"${qual?.compLabel || 'ดีเยี่ยม (๓)'}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ปพ5_สมุดบันทึกพัฒนาคุณภาพผู้เรียน_${selectedCourse.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    emitAppToast({
      tone: 'success',
      message: `ส่งออกสมุด ปพ.5 (${selectedCourse.code}) เป็นไฟล์ CSV แล้ว`,
    });
  };

  const handleExportPp3CSV = () => {
    const headers = [
      'ลำดับที่',
      'เลขประจำตัวนักเรียน',
      'เลขประจำตัวประชาชน (13 หลัก DMC)',
      'คำนำหน้า',
      'ชื่อ',
      'นามสกุล',
      'ระดับชั้นที่สำเร็จการศึกษา',
      'ห้อง',
      'รอบประเมิน',
      'GPAX / คะแนนเฉลี่ย (%)',
      'เลขที่ชุด_ปพ3',
      'เลขที่เอกสาร',
      'วันที่อนุมัติจบการศึกษา',
      'สถานะการสำเร็จการศึกษา'
    ];

    const regMap = loadSchoolRegistryMap(school?.id || 'default');
    const signers = loadSchoolRegistrySigners(school?.id || 'default');
    const rows = pp3EligibleStudents.map((s, idx) => {
      const summary = calculateStudentAcademicSummary({
        student: s,
        courses,
        grades,
        gradingSystem: systemConfig.gradingSystem,
      });
      const reg = getStudentRegistryRecord(regMap, s, signers);
      const pp3Meta = getPp3ApprovalStatusMeta(reg.pp3ApprovalStatus);
      const metricValue = summary.hideGpaCalculations
        ? (summary.averageRawScore !== null
            ? `${summary.averageRawScore}% (${getRawScoreFeedback(summary.averageRawScore).labelTh})`
            : 'รอประเมิน (รายปี)')
        : (summary.hasRecordedGrades && summary.gpax !== null ? summary.gpax : 0).toFixed(2);
      return [
        idx + 1,
        `"${s.studentIdNumber}"`,
        `"${s.nationalId || ''}"`,
        `"${reg.prefixTh || getStudentPrefixTh(s)}"`,
        `"${s.firstNameTh}"`,
        `"${s.lastNameTh}"`,
        `"${s.gradeLevel}"`,
        `"${s.room}"`,
        `"${summary.isPrimary ? 'รายปี' : 'รายภาคเรียน'}"`,
        `"${metricValue}"`,
        `"${reg.pp3SetNo || ''}"`,
        `"${reg.pp3BookNo || ''}"`,
        `"${reg.graduationDate || ''}"`,
        `"${pp3Meta.labelTh}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `สพฐ_ปพ3_ออนไลน์_รายงานผู้สำเร็จการศึกษา_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportOnetCSV = () => {
    const headers = [
      'รหัสสนามสอบ',
      'เลขที่นั่งสอบ',
      'เลขประจำตัวประชาชน (13 หลัก)',
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ระดับชั้น',
      'ภาษาไทย (100)',
      'คณิตศาสตร์ (100)',
      'วิทยาศาสตร์ (100)',
      'ภาษาอังกฤษ (100)',
      'คะแนนเฉลี่ยรวม (%)',
      'สถานะนำส่ง สทศ.'
    ];

    const rows = onetRows.map((row) => [
      `"1001-01"`,
      `"${row.seatNo}"`,
      `"${row.nationalId}"`,
      `"${row.stu.studentIdNumber}"`,
      `"${getStudentShortPrefixTh(row.stu)} ${row.stu.firstNameTh} ${row.stu.lastNameTh}"`,
      `"${row.stu.gradeLevel}"`,
      row.thScore,
      row.mathScore,
      row.sciScore,
      row.engScore,
      row.avgNumber.toFixed(2),
      `"นำส่งข้อมูล สทศ. เรียบร้อย"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `สทศ_ONET_ข้อมูลผู้มีสิทธิ์สอบและผลการสอบ_${onetLevelFilter.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // One-Click Official Thai Exports: DMC & SchoolMIS Templates
  const handleExportDmcCsv = () => {
    const headers = [
      'รหัสสถานศึกษา',
      'เลขประจำตัวประชาชน (13 หลัก)',
      'รหัสประจำตัวนักเรียน',
      'คำนำหน้า',
      'ชื่อ',
      'นามสกุล',
      'เพศ',
      'ระดับชั้น',
      'ห้องเรียน',
      'GPAX',
      'เวลาเรียนร้อยละ',
      'สถานะนักเรียน',
    ];
    const rows = students.map((s, idx) => {
      const eligibility = calculateStudentCourseEligibility({
        student: s,
        timetableSlots,
        attendance,
        periodAttendance,
      });
      const summary = calculateStudentAcademicSummary({
        student: s,
        courses,
        grades,
        gradingSystem: systemConfig.gradingSystem,
      });
      const effectiveGpax = summary.hasRecordedGrades ? (summary.gpax ?? summary.annualGradeAverage ?? 0) : 0;
      return [
        `"${s.schoolId || ''}"`,
        `"${s.nationalId || `1100${idx.toString().padStart(9, '0')}`}"`,
        `"${s.studentIdNumber}"`,
        `"${getStudentPrefixTh(s)}"`,
        `"${s.firstNameTh}"`,
        `"${s.lastNameTh}"`,
        `"${s.gender === 'female' ? 'หญิง' : 'ชาย'}"`,
        `"${s.gradeLevel}"`,
        `"${s.room}"`,
        effectiveGpax.toFixed(2),
        eligibility.attendancePercent,
        `"${s.status === 'active' ? 'กำลังศึกษา' : s.status}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DMC_สพฐ_${systemConfig.academicYear}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportSchoolMisCsv = () => {
    const course = selectedCourse || courses[0];
    if (!course) return;
    const targetGrades = grades.filter((g) => g.courseId === course.id);
    const targetStage = detectCourseEducationStage(course, students);
    const targetIsPrimary = isPrimaryStage(targetStage);
    const headers = [
      'รหัสวิชา',
      'ชื่อรายวิชา',
      'รอบการประเมิน',
      'ปีการศึกษา',
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ห้องเรียน',
      'มาเรียน (%)',
      'สถานะสิทธิ์สอบ',
      'คะแนนระหว่างเรียน (60)',
      'คะแนนปลายภาค/ปลายปี (40)',
      'คะแนนรวม (100)',
      'ร้อยละ (%)',
      'ผลการเรียน',
    ];
    const rows = targetGrades.map((g) => {
      const stu = students.find((s) => s.id === g.studentId);
      const eligibility = stu
        ? calculateStudentCourseEligibility({
            student: stu,
            course,
            timetableSlots,
            attendance,
            periodAttendance,
          })
        : { attendancePercent: 95, isAtRiskMs: false };
      const disp = resolveEffectiveGrade(g, course, systemConfig.gradingSystem, eligibility.isAtRiskMs);
      return [
        `"${course.code}"`,
        `"${course.titleTh}"`,
        `"${targetIsPrimary ? 'รายปี' : `ภาคเรียนที่ ${course.semester || systemConfig.currentSemester}`}"`,
        `"${course.academicYear || systemConfig.academicYear}"`,
        `"${stu?.studentIdNumber || ''}"`,
        `"${stu ? `${getStudentShortPrefixTh(stu)} ${stu.firstNameTh} ${stu.lastNameTh}` : ''}"`,
        `"${stu?.room || ''}"`,
        eligibility.attendancePercent,
        `"${eligibility.isAtRiskMs ? 'มส. (เวลาเรียนไม่ถึง 80%)' : 'มีสิทธิ์สอบ'}"`,
        g.midtermScore + g.assignmentScore + g.quizScore,
        g.finalScore,
        g.totalScore,
        `${g.totalScore}%`,
        `"${disp.letter}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SchoolMIS_${course.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const hasActiveGradeFilters =
    gradeRoomFilter !== 'all' ||
    gradeLevelFilter !== 'all' ||
    gradeEligibilityFilter !== 'all' ||
    gradeStatusFilter !== 'all' ||
    courseTeacherFilter !== 'all' ||
    studentSearchTerm.trim().length > 0 ||
    courseSearchTerm.trim().length > 0;

  const isMyCoursesFilterActive = Boolean(
    loggedInTeacherFilterKey && courseTeacherFilter === loggedInTeacherFilterKey
  );

  const primarySection: 'scores' | 'registry' | 'reports' =
    activeTab === 'moe_student_hub' || activeTab === 'pp6' || activeTab === 'core_report_card'
      ? 'registry'
      : activeTab === 'gradebook' || activeTab === 'indicators'
      ? 'scores'
      : 'reports';

  const REPORT_VIEW_OPTIONS: Array<{
    id: 'pp5' | 'pp5_core_summary' | 'qualitative_summary' | 'pp3_online' | 'onet_niets';
    labelTh: string;
    labelEn: string;
  }> = [
    { id: 'pp5', labelTh: 'ปพ.5 แบบบันทึกผลการเรียนประจำวิชา (พิมพ์ A4)', labelEn: 'Pp.5 Course Record (A4)' },
    { id: 'pp5_core_summary', labelTh: 'สรุปผล ปพ.5 ทั้งห้อง & ตัวชี้วัด', labelEn: 'Pp.5 Room Summary' },
    { id: 'qualitative_summary', labelTh: 'สรุปคุณลักษณะฯ & การอ่าน คิดวิเคราะห์ เขียน', labelEn: 'Qualitative Summary' },
    { id: 'pp3_online', labelTh: 'ปพ.3 แบบรายงานผู้สำเร็จการศึกษา (ป.6 / ม.3 / ม.6)', labelEn: 'Pp.3 Graduation Registry' },
    { id: 'onet_niets', labelTh: 'สทศ. O-NET (ป.6 / ม.3 / ม.6)', labelEn: 'NIETS O-NET' },
  ];

  const openStudentInRegistry = (studentId: string, docView: MoeDocViewSelection = 'pp1') => {
    if (embeddedInStudentManagement && onSwitchToStudentRegistry) {
      onSwitchToStudentRegistry(studentId, docView);
      return;
    }
    setSelectedStudentIdForPp6(studentId);
    setHubDocViewOverride(docView);
    setActiveTab('moe_student_hub');
  };

  return (
    <div className={`${getModuleTone('gradebook')} h-full flex flex-col min-h-0 overflow-hidden ${embeddedInStudentManagement ? 'space-y-2' : 'space-y-4'}`}>
      {/* Gradebook Header: Slim sub-toolbar when embedded inside StudentsView; clean single header standalone */}
      <div className={`shrink-0 flex flex-wrap items-center justify-between gap-2.5 print:hidden ${
        embeddedInStudentManagement
          ? 'px-1 py-1.5 border-b border-[var(--color-border)]'
          : 'app-page-header px-5 py-3'
      }`}>
        <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">
          {!embeddedInStudentManagement && (
            <div className="flex items-center gap-3 min-w-0">
              <span className="tone-chip w-9 h-9 rounded-xl shrink-0">
                <Award className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="module-category-kicker">02 · วัดผล สพฐ. &amp; การสอน</div>
                <h1 className="text-base md:text-lg font-bold text-[var(--color-text-title)] leading-tight truncate">
                  {isPersonalGradeViewer
                    ? 'ผลการเรียน & ใบ ปพ.6'
                    : 'บันทึกคะแนน & งานทะเบียน'}
                </h1>
              </div>
            </div>
          )}

          {onChangeGradingSystem && (currentRole === 'admin' || currentRole === 'super_admin') ? (
            <div data-guide-id="gradebook-grading-mode" className="seg-tab-group text-xs shrink-0">
              <button
                type="button"
                disabled={isUpdatingGradingMode}
                data-active={systemConfig.gradingSystem !== 'international'}
                onClick={async () => {
                  if (systemConfig.gradingSystem === 'thai') return;
                  setIsUpdatingGradingMode(true);
                  try { await onChangeGradingSystem('thai'); } finally { setIsUpdatingGradingMode(false); }
                }}
                className="seg-tab-btn px-2 py-0.5 text-[11px]"
              >
                0–4
              </button>
              <button
                type="button"
                disabled={isUpdatingGradingMode}
                data-active={systemConfig.gradingSystem === 'international'}
                onClick={async () => {
                  if (systemConfig.gradingSystem === 'international') return;
                  setIsUpdatingGradingMode(true);
                  try { await onChangeGradingSystem('international'); } finally { setIsUpdatingGradingMode(false); }
                }}
                className="seg-tab-btn px-2 py-0.5 text-[11px]"
              >
                A–F
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-[var(--color-text-muted)] shrink-0">
              ระบบ {systemConfig.gradingSystem === 'international' ? 'A–F' : '0–4'}
            </span>
          )}

          {/* Clean Inline Tabs */}
          {isPersonalGradeViewer ? (
            <div data-guide-id="gradebook-tabs" className="seg-tab-group text-[11px]">
              <button
                type="button"
                data-active={activeTab === 'pp6'}
                onClick={() => setActiveTab('pp6')}
                className="seg-tab-btn py-0.5"
              >
                ใบรายงานผล (ปพ.6)
              </button>
              <button
                type="button"
                data-active={activeTab === 'gradebook'}
                onClick={() => setActiveTab('gradebook')}
                className="seg-tab-btn py-0.5"
              >
                คะแนนรายวิชา
              </button>
            </div>
          ) : (
            <div
              data-guide-id="gradebook-tabs"
              className="flex flex-wrap items-center gap-2"
            >
              <div className="seg-tab-group overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  data-active={primarySection === 'scores'}
                  onClick={() => {
                    if (primarySection !== 'scores') setActiveTab('gradebook');
                  }}
                  className="seg-tab-btn whitespace-nowrap"
                >
                  {lang === 'th' ? 'บันทึกคะแนน' : 'Course Grading'}
                </button>
                {!embeddedInStudentManagement && (
                  <button
                    type="button"
                    data-active={primarySection === 'registry'}
                    onClick={() => setActiveTab('moe_student_hub')}
                    className="seg-tab-btn whitespace-nowrap"
                  >
                    {lang === 'th' ? 'ทะเบียน ปพ.1–8' : 'Registry & Docs'}
                  </button>
                )}
                <button
                  type="button"
                  data-active={primarySection === 'reports'}
                  onClick={() => {
                    if (primarySection !== 'reports') setActiveTab('pp5');
                  }}
                  className="seg-tab-btn whitespace-nowrap"
                >
                  {lang === 'th' ? 'รายงาน สพฐ.' : 'OBEC Reports'}
                </button>
              </div>

              {primarySection === 'reports' && (
                <select
                  aria-label={lang === 'th' ? 'เลือกแบบรายงาน' : 'Select report'}
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
                  className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 text-xs font-semibold text-[var(--color-text-title)] outline-none focus:border-[var(--tone)] cursor-pointer"
                >
                  {REPORT_VIEW_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {lang === 'th' ? opt.labelTh : opt.labelEn}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-1.5 flex-wrap">
          {!embeddedInStudentManagement && <ModuleTourTrigger moduleId="gradebook" lang={lang} />}

          {activeTab === 'pp3_online' && (
            <button
              type="button"
              onClick={handleExportPp3CSV}
              className="btn-action-success px-2.5 py-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก ปพ.3</span>
            </button>
          )}

          {activeTab === 'onet_niets' && (
            <button
              type="button"
              onClick={handleExportOnetCSV}
              className="btn-action-success px-2.5 py-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก สทศ.</span>
            </button>
          )}

          {(activeTab === 'pp3_online' || activeTab === 'onet_niets') && (
            <button
              type="button"
              onClick={handlePrint}
              className="btn-tool-tone px-2.5 py-1.5"
            >
              <Printer className="w-3.5 h-3.5 tone-text" />
              <span>พิมพ์</span>
            </button>
          )}

          {/* Consolidated Export, Import & Notification Tools Dropdown (Staff only) */}
          {!isPersonalGradeViewer && (
          <details className="relative group">
            <summary className="btn-tool-tone list-none px-2.5 py-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 tone-text" />
              <span className="hidden sm:inline">ส่งออก &amp; เครื่องมือ</span>
              <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
            </summary>
            <div className="absolute right-0 mt-1 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-1.5 z-30 space-y-1 text-xs">
              {activeTab === 'gradebook' && (
                <button
                  type="button"
                  data-guide-id="gradebook-autonotify"
                  onClick={() => setAutoNotifyEnabled((prev) => !prev)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    {autoNotifyEnabled ? <BellRing className="w-3.5 h-3.5 tone-text" /> : <BellOff className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
                    <span>แจ้งเตือนคะแนนอัตโนมัติ</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${autoNotifyEnabled ? 'tone-active' : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)]'}`}>
                    {autoNotifyEnabled ? 'เปิด' : 'ปิด'}
                  </span>
                </button>
              )}
              {activeTab === 'gradebook' && onOpenImportExport && (
                <button
                  type="button"
                  data-guide-id="gradebook-import-csv"
                  onClick={onOpenImportExport}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer text-left"
                >
                  <Upload className="w-3.5 h-3.5 tone-text" />
                  <span>นำเข้าคะแนน CSV / Excel</span>
                </button>
              )}
              {activeTab === 'gradebook' && (
                <button
                  type="button"
                  data-guide-id="gradebook-pdf-export"
                  onClick={handleDownloadGradeDistributionPdf}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-rose-700 dark:text-rose-300 font-semibold cursor-pointer text-left"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF (สรุปผลเกรด)</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer text-left"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                <span>ส่งออก ปพ.5 (CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleExportDmcCsv}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer text-left"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
                <span>ส่งออก DMC สพฐ.</span>
              </button>
              <button
                type="button"
                onClick={handleExportSchoolMisCsv}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] text-[var(--color-text-body)] cursor-pointer text-left"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                <span>ส่งออก SchoolMIS</span>
              </button>
            </div>
          </details>
          )}

          {effectiveCanEditGrades && activeTab === 'gradebook' && onAddGrade && studentsWithoutGradeInCourse.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAddGradeForm((prev) => !prev);
                if (!newGradeStudentId && studentsWithoutGradeInCourse[0]) {
                  setNewGradeStudentId(studentsWithoutGradeInCourse[0].id);
                }
              }}
              className="btn-action-primary px-3 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึกคะแนน</span>
            </button>
          )}
        </div>
      </div>

      {/* Single-Row Slim Course & Student Search / Collapsible Filter Toolbar */}
      {(activeTab === 'gradebook' || activeTab === 'indicators' || activeTab === 'pp5') && (() => {
        const extraFilterCount =
          (courseSearchTerm.trim() ? 1 : 0) +
          (courseTeacherFilter !== 'all' ? 1 : 0) +
          (gradeLevelFilter !== 'all' ? 1 : 0) +
          (gradeRoomFilter !== 'all' ? 1 : 0) +
          (gradeStatusFilter !== 'all' ? 1 : 0) +
          (gradeEligibilityFilter !== 'all' ? 1 : 0);

        return (
          <div data-guide-id="gradebook-course-bar" className={`shrink-0 toolbar-filter-zone print:hidden ${
            embeddedInStudentManagement ? 'space-y-1.5 py-1.5 px-2.5' : 'space-y-2 py-2 px-3'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              {loggedInTeacherFilterKey && (
                <button
                  type="button"
                  onClick={() => {
                    const nextKey = isMyCoursesFilterActive ? 'all' : loggedInTeacherFilterKey;
                    setCourseTeacherFilter(nextKey);
                    const matchingCourses = courses.filter((course) =>
                      courseMatchesTeacherFilter(course, nextKey, courseTeacherOptions)
                    );
                    if (matchingCourses.length > 0 && !matchingCourses.some((c) => c.id === selectedCourseId)) {
                      setSelectedCourseId(matchingCourses[0].id);
                    }
                    setGradePage(0);
                    setPp5Page(0);
                  }}
                  data-active={isMyCoursesFilterActive}
                  className="btn-tool-neutral h-9 px-2.5 text-xs shrink-0"
                  title={
                    isMyCoursesFilterActive
                      ? 'คลิกเพื่อดูรายวิชาของครูทุกคนในโรงเรียน'
                      : 'คลิกเพื่อกรองเฉพาะรายวิชาที่คุณสอน'
                  }
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    {isMyCoursesFilterActive
                      ? `วิชาของฉัน (${loggedInTeacherOption?.count ?? filteredCourses.length})`
                      : `วิชาของฉัน (${loggedInTeacherOption?.count ?? 0})`}
                  </span>
                </button>
              )}

              {/* Primary Course Select */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <BookOpen className="w-3.5 h-3.5 text-[var(--tone)] shrink-0" />
                <select
                  aria-label="เลือกรายวิชา"
                  value={selectedCourseId}
                  onChange={(event) => {
                    setSelectedCourseId(event.target.value);
                    setGradePage(0);
                    setPp5Page(0);
                    setGradeRoomFilter('all');
                    setGradeLevelFilter('all');
                    setGradeEligibilityFilter('all');
                    setGradeStatusFilter('all');
                  }}
                  disabled={courseSelectOptions.length === 0}
                  className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 text-xs font-semibold text-[var(--color-text-title)] outline-none focus:border-[var(--tone)] disabled:opacity-60"
                >
                  {courseSelectOptions.length === 0 ? (
                    <option value="">ไม่พบรายวิชาที่ตรงกับตัวกรอง</option>
                  ) : (
                    courseSelectOptions.map((course) => (
                      <option key={course.id} value={course.id}>
                        {[course.code, course.titleTh || course.titleEn, course.teacherName]
                          .filter(Boolean)
                          .join(' — ')}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Evaluation settings and score modes */}
              {!isPersonalGradeViewer && (activeTab === 'gradebook' || activeTab === 'indicators') && (
                <details className="relative shrink-0">
                  <summary className="btn-tool-tone list-none h-9 px-2.5 text-xs cursor-pointer">
                    <Calculator className="w-3.5 h-3.5 tone-text" />
                    <span>เกณฑ์ประเมิน</span>
                    <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
                  </summary>
                  <div className="absolute right-0 z-40 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-xl space-y-1.5">
                    <button
                      type="button"
                      data-active={activeTab === 'gradebook'}
                      onClick={(event) => {
                        setActiveTab('gradebook');
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] data-[active=true]:bg-[var(--tone-soft)] data-[active=true]:text-[var(--tone)]"
                    >
                      สมุดคะแนน (ปพ.5)
                    </button>
                    <button
                      type="button"
                      data-active={activeTab === 'indicators'}
                      onClick={(event) => {
                        setActiveTab('indicators');
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)] data-[active=true]:bg-[var(--tone-soft)] data-[active=true]:text-[var(--tone)]"
                    >
                      ตัวชี้วัด สพฐ.
                    </button>
                    {effectiveCanEditGrades && (
                      <button
                        type="button"
                        onClick={(event) => {
                          setActiveTab('gradebook');
                          setShowWeightConfigPanel(
                            activeTab === 'gradebook' ? !showWeightConfigPanel : true
                          );
                          event.currentTarget.closest('details')?.removeAttribute('open');
                        }}
                        className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]"
                      >
                        {activeTab === 'gradebook' && showWeightConfigPanel
                          ? 'ซ่อนการตั้งค่าน้ำหนักคะแนน'
                          : 'ตั้งค่าน้ำหนักคะแนน'}
                      </button>
                    )}
                    <p className="border-t border-[var(--color-border)] px-2.5 pt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      เกณฑ์ผลการเรียน: {isPrimaryCourse
                        ? '80–100 ดีเยี่ยม · 70–79 ดีมาก · 60–69 ดี · 50–59 ผ่าน'
                        : getGradingScaleLegend(systemConfig.gradingSystem)}
                    </p>
                  </div>
                </details>
              )}

              {/* Student Live Search */}
              {!isPersonalGradeViewer && (
                <div className="relative w-full sm:w-52 shrink-0">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(event) => {
                      setStudentSearchTerm(event.target.value);
                      setGradePage(0);
                      setPp5Page(0);
                    }}
                    placeholder="ค้นหานักเรียน / ห้อง..."
                    className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] pl-8 pr-7 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--tone)]"
                  />
                  {studentSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearchTerm('');
                        setGradePage(0);
                        setPp5Page(0);
                      }}
                      aria-label="ล้างคำค้นหานักเรียน"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Collapsible Extra Filters Toggle */}
              {!isPersonalGradeViewer && (
                <button
                  type="button"
                  data-active={showMoreFilters || extraFilterCount > 0}
                  onClick={() => setShowMoreFilters((prev) => !prev)}
                  className="btn-tool-neutral h-9 px-3 text-xs shrink-0"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>ตัวกรอง{extraFilterCount > 0 ? ` (${extraFilterCount})` : ''}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
                </button>
              )}

              {!isPersonalGradeViewer && (
                <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums whitespace-nowrap px-1">
                  {activeTab === 'gradebook'
                    ? gradebookRows.length > 0
                      ? `${filteredGradebookRows.length}/${gradebookRows.length} คน`
                      : '—'
                    : courseGrades.length > 0
                      ? `${courseGrades.length} คน`
                      : '—'}
                </span>
              )}

              {hasActiveGradeFilters && !isPersonalGradeViewer && (
                <button
                  type="button"
                  onClick={() => {
                    setCourseSearchTerm('');
                    setCourseTeacherFilter('all');
                    setStudentSearchTerm('');
                    setGradeRoomFilter('all');
                    setGradeLevelFilter('all');
                    setGradeEligibilityFilter('all');
                    setGradeStatusFilter('all');
                    setGradePage(0);
                    setPp5Page(0);
                  }}
                  className="h-8 px-2 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer whitespace-nowrap"
                >
                  ล้าง
                </button>
              )}
            </div>

            {/* Expandable Secondary Filters Drawer */}
            {showMoreFilters && !isPersonalGradeViewer && (
              <div className="pt-1.5 border-t border-[var(--color-border)] flex flex-wrap items-center gap-1.5">
                <div className="relative w-full sm:w-40 shrink-0">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={courseSearchTerm}
                    onChange={(event) => setCourseSearchTerm(event.target.value)}
                    placeholder={`กรองชื่อวิชา (${courses.length})...`}
                    className="w-full h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] pl-6 pr-5 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--tone)]"
                  />
                  {courseSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setCourseSearchTerm('')}
                      aria-label="ล้างคำค้นหารายวิชา"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {courseTeacherOptions.length > 0 && (
                  <select
                    aria-label="กรองวิชาตามรายชื่อครู"
                    value={courseTeacherFilter}
                    onChange={(event) => {
                      const nextTeacher = event.target.value;
                      setCourseTeacherFilter(nextTeacher);
                      const matchingCourses = courses.filter((course) => {
                        if (!courseMatchesTeacherFilter(course, nextTeacher, courseTeacherOptions)) return false;
                        const search = courseSearchTerm.trim().toLocaleLowerCase();
                        return !search || [course.code, course.titleTh, course.titleEn, course.teacherName, course.department, course.room]
                          .some((value) => value?.toLocaleLowerCase().includes(search));
                      });
                      if (matchingCourses.length > 0 && !matchingCourses.some((c) => c.id === selectedCourseId)) {
                        setSelectedCourseId(matchingCourses[0].id);
                      }
                      setGradePage(0);
                      setPp5Page(0);
                      setGradeRoomFilter('all');
                      setGradeLevelFilter('all');
                      setGradeEligibilityFilter('all');
                      setGradeStatusFilter('all');
                    }}
                    className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--tone)]"
                  >
                    <option value="all">ครูผู้สอนทุกคน ({courseTeacherOptions.length})</option>
                    {courseTeacherOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count})
                      </option>
                    ))}
                  </select>
                )}

                {activeTab === 'gradebook' && (
                  <>
                    <select
                      aria-label="กรองระดับชั้น"
                      value={gradeLevelFilter}
                      onChange={(event) => {
                        setGradeLevelFilter(event.target.value);
                        setGradePage(0);
                      }}
                      className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกชั้น</option>
                      {gradeLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>

                    <select
                      aria-label="กรองห้องเรียน"
                      value={gradeRoomFilter}
                      onChange={(event) => {
                        setGradeRoomFilter(event.target.value);
                        setGradePage(0);
                      }}
                      className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกห้อง</option>
                      {gradeRoomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
                    </select>

                    <select
                      aria-label="กรองกลุ่มผลการเรียน"
                      value={gradeStatusFilter}
                      onChange={(event) => {
                        const v = event.target.value;
                        if (v === 'all' || v === 'excellent' || v === 'pass' || v === 'at_risk') {
                          setGradeStatusFilter(v);
                        }
                        setGradePage(0);
                      }}
                      className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">ทุกเกรด</option>
                      <option value="excellent">ดีเยี่ยม (3.5–4)</option>
                      <option value="pass">ผ่านเกณฑ์</option>
                      <option value="at_risk">กลุ่มเสี่ยง (0, ร, มส.)</option>
                    </select>

                    <select
                      aria-label="กรองสิทธิ์สอบเวลาเรียน"
                      value={gradeEligibilityFilter}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === 'all' || value === 'eligible' || value === 'at_risk') {
                          setGradeEligibilityFilter(value);
                        }
                        setGradePage(0);
                      }}
                      className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-text-title)]"
                    >
                      <option value="all">เวลาเรียนทั้งหมด</option>
                      <option value="eligible">มีสิทธิ์สอบ (≥80%)</option>
                      <option value="at_risk">เสี่ยง มส. (&lt;80%)</option>
                    </select>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab Panels Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2 print:overflow-visible">
        {/* Visual Grade Distribution Histogram across selected course & all subjects (Staff only) */}
        {activeTab === 'gradebook' && !isPersonalGradeViewer && (
          <div data-guide-id="gradebook-histogram">
            <GradeDistributionHistogram
              courses={courses}
              teachers={teachers}
              grades={grades}
              filteredCourseGrades={filteredGradebookRows.map((row) => {
                const live = computeLiveObecGrade(row.grade);
                return {
                  ...row.grade,
                  totalScore: live.totalScore,
                  letterGrade: live.letter,
                  gradePoint: live.point,
                };
              })}
              students={students}
              selectedCourse={selectedCourse}
              gradingSystem={systemConfig.gradingSystem}
              lang={lang}
              scope={histogramScope}
              onScopeChange={setHistogramScope}
              chartMode={histogramChartMode}
              onChartModeChange={setHistogramChartMode}
              departmentFilter={histogramDeptFilter}
              onDepartmentFilterChange={setHistogramDeptFilter}
              teacherFilter={courseTeacherFilter}
              onTeacherFilterChange={setCourseTeacherFilter}
              onDownloadPdf={handleDownloadGradeDistributionPdf}
            />
          </div>
        )}

        {/* ========================================================
            TAB 1: Gradebook Score Entry Table
            ======================================================== */}
        {activeTab === 'gradebook' && selectedCourse && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden print:overflow-visible">
          {/* Single slim Course + MOE Stage Bar */}
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-mono font-bold text-[var(--color-primary-text)]">{selectedCourse.code}</span>
              <span className="text-[var(--color-text-title)] font-bold truncate">{selectedCourse.titleTh || selectedCourse.titleEn}</span>
              <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                · {selectedCourse.teacherName || '—'} · {isPrimaryCourse ? `รายปี ${systemConfig.academicYear}` : `${formatSemesterLabel(systemConfig.currentSemester)}/${systemConfig.academicYear}`}
                {shouldShowCourseCredits(selectedCourse.code, school?.showPrimaryCourseCredits ?? false) &&
                  (selectedCourse.credits === 0 ? ' · ไม่มีหน่วยกิต' : ` · ${selectedCourse.credits} นก.`)}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                courseIsActivity
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                  : isPrimaryCourse
                  ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200'
                  : 'border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200'
              }`}>
                {courseIsActivity
                  ? 'กิจกรรม ผ/มผ'
                  : `${getEducationStageLabelTh(courseStage)} · ${isPrimaryCourse ? 'รายปี' : 'รายภาค'}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 print:hidden">
              {effectiveCanEditGrades && homeworkSyncMap.size > 0 && (
                <button
                  type="button"
                  onClick={handleSyncHomeworkScores}
                  disabled={homeworkSyncCandidates.length === 0}
                  title="ดึงคะแนนชิ้นงานที่ตรวจแล้วในระบบ Homework Tracker มาใส่ช่อง Homework (เต็ม 20) อัตโนมัติ"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-100 disabled:text-emerald-800 dark:disabled:bg-emerald-950/50 dark:disabled:text-emerald-300 text-white text-[11px] font-bold cursor-pointer transition"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {homeworkSyncCandidates.length > 0
                      ? `ซิงค์คะแนนการบ้าน (${homeworkSyncCandidates.length} คน)`
                      : `ซิงค์การบ้านครบแล้ว (${homeworkSyncMap.size})`}
                  </span>
                </button>
              )}
              {effectiveCanEditGrades && (
              <button
                type="button"
                onClick={() => setShowBatchPastePanel((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition whitespace-nowrap ${
                  showBatchPastePanel
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>วางคะแนนจาก Excel</span>
              </button>
              )}
            </div>
          </div>

          <div className="p-2.5 space-y-2.5">
          {/* Real-time OBEC Score Weighting & Auto-Grading Panel */}
          {showWeightConfigPanel && effectiveCanEditGrades && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-3 space-y-2.5 text-xs print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Calculator className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                  <h3 className="font-bold text-[var(--color-text-title)]">
                    คำนวณเกรดอัตโนมัติตามเกณฑ์ สพฐ. (ปรับค่าน้ำหนักแบบ Real-time)
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-[var(--color-primary-text)] tabular-nums">
                    สัดส่วน ระหว่างภาค {normalizedWeightPercents.duringTerm}% : ปลายภาค {normalizedWeightPercents.final}%
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {OBEC_WEIGHT_PRESETS.map((preset) => {
                    const isPresetActive =
                      activeCourseWeights.midterm === preset.weights.midterm &&
                      activeCourseWeights.final === preset.weights.final &&
                      activeCourseWeights.assignment === preset.weights.assignment &&
                      activeCourseWeights.quiz === preset.weights.quiz;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => updateActiveCourseWeights(preset.weights)}
                        className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                          isPresetActive
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  {!isDefaultCourseWeights && (
                    <button
                      type="button"
                      onClick={() => updateActiveCourseWeights(DEFAULT_SCORE_WEIGHTS)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>ค่าเริ่มต้น</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Component Weight Sliders */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { key: 'midterm' as const, label: 'สอบกลางภาค (Midterm)', maxRaw: 30 },
                  { key: 'final' as const, label: 'สอบปลายภาค (Final)', maxRaw: 40 },
                  { key: 'assignment' as const, label: 'งาน/ชิ้นงาน (Assignment)', maxRaw: 20 },
                  { key: 'quiz' as const, label: 'ทดสอบย่อย (Quiz)', maxRaw: 10 },
                ].map((item) => {
                  const rawW = activeCourseWeights[item.key];
                  const normPct = normalizedWeightPercents[item.key];
                  return (
                    <div
                      key={item.key}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-[var(--color-text-title)] truncate">
                          {item.label}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[var(--color-primary-text)] tabular-nums shrink-0">
                          {normPct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={5}
                          aria-label={`น้ำหนักคะแนน${item.label}`}
                          value={rawW}
                          onChange={(e) =>
                            updateActiveCourseWeights({
                              ...activeCourseWeights,
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="w-full accent-[var(--color-primary)] cursor-pointer"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          aria-label={`กรอกน้ำหนักคะแนน${item.label}`}
                          value={rawW}
                          onChange={(e) =>
                            updateActiveCourseWeights({
                              ...activeCourseWeights,
                              [item.key]: Number(e.target.value),
                            })
                          }
                          className="w-12 px-1 py-0.5 text-center rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono text-xs font-bold text-[var(--color-text-title)] tabular-nums"
                        />
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        คะแนนดิบเต็ม {item.maxRaw} · คิดเป็น {normPct}% ของเกรดรวม
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Impact & Commit Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
                <div className="flex flex-wrap items-center gap-3 text-[11px] tabular-nums">
                  {weightSum !== 100 && (
                    <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                      ผลรวมน้ำหนัก = {weightSum} (ระบบปรับสัดส่วนเป็น 100% อัตโนมัติ)
                      <button
                        type="button"
                        onClick={handleNormalizeWeightsTo100}
                        className="underline font-bold cursor-pointer"
                      >
                        ปรับรวมเป็น 100
                      </button>
                    </span>
                  )}
                  <span className="text-[var(--color-text-muted)]">
                    GPA เฉลี่ย Real-time:{' '}
                    <strong className="font-mono text-[var(--color-text-title)]">
                      {weightSimulationSummary.liveAvgGpa.toFixed(2)}
                    </strong>
                    {weightSimulationSummary.gpaDelta !== 0 && (
                      <span
                        className={`ml-1 font-mono font-bold ${
                          weightSimulationSummary.gpaDelta > 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        ({weightSimulationSummary.gpaDelta > 0 ? '+' : ''}
                        {weightSimulationSummary.gpaDelta.toFixed(2)})
                      </span>
                    )}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    อัตราผ่านเกณฑ์:{' '}
                    <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                      {weightSimulationSummary.passRate}%
                    </strong>
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    เปลี่ยนแปลง:{' '}
                    <strong className="font-mono text-[var(--color-primary-text)]">
                      {weightSimulationSummary.changedCount}/{weightSimulationSummary.totalRows} คน
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={weightSimulationSummary.changedCount === 0}
                    onClick={handleApplyWeightsToCourseGrades}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-45 text-white text-[11px] font-bold cursor-pointer transition whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {weightSimulationSummary.changedCount > 0
                        ? `บันทึกผลตัดเกรด Real-time (${weightSimulationSummary.changedCount} คน)`
                        : 'ผลเกรดตรงตามน้ำหนักแล้ว'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Batch Excel / Sheets Score Paste Panel */}
          {showBatchPastePanel && (
            <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 p-3 space-y-2.5 text-xs print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
                    <span>วางคะแนนรวดเดียวจาก Excel / Google Sheets</span>
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    คัดลอกคอลัมน์คะแนนล้วน (เรียงตามตารางด้านล่าง {filteredGradebookRows.length} คน) หรือคัดลอกแบบ 2 คอลัมน์ &quot;รหัสนักเรียน [Tab] คะแนน&quot; มาวางได้ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBatchPastePanel(false)}
                  className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2.5 items-start">
                <div className="space-y-2">
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">ช่องคะแนนที่ต้องการวาง:</span>
                    <select
                      value={batchPasteField}
                      onChange={(e) => setBatchPasteField(e.target.value as typeof batchPasteField)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
                    >
                      <option value="midtermScore">กลางภาค (เต็ม 30)</option>
                      <option value="finalScore">ปลายภาค (เต็ม 40)</option>
                      <option value="assignmentScore">การบ้าน/ชิ้นงาน (เต็ม 20)</option>
                      <option value="quizScore">แบบทดสอบย่อย (เต็ม 10)</option>
                    </select>
                  </label>
                  <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    จับคู่สำเร็จ: <strong className="text-emerald-700 dark:text-emerald-300">{parsedBatchUpdates.length}</strong> คน
                  </div>
                </div>
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={batchPasteText}
                    onChange={(e) => setBatchPasteText(e.target.value)}
                    placeholder={`ตัวอย่างแบบที่ 1 (วางคอลัมน์คะแนน):\n24\n28\n19\n\nตัวอย่างแบบที่ 2 (รหัสนักเรียน คะแนน):\n${filteredGradebookRows[0]?.student.studentIdNumber || 'STU-001'}\t25`}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2 font-mono text-xs text-[var(--color-text-title)] focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchPasteText('')}
                      disabled={!batchPasteText}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-body)] disabled:opacity-40 cursor-pointer"
                    >
                      ล้างข้อความ
                    </button>
                    <button
                      type="button"
                      disabled={parsedBatchUpdates.length === 0}
                      onClick={handleApplyBatchPaste}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>นำเข้าคะแนน ({parsedBatchUpdates.length} คน)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Automated Grade Notification Confirmation Toast */}
          {gradeAlertBanner && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-2 text-xs text-indigo-900 dark:text-indigo-100 flex items-center justify-between gap-2 print:hidden"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BellRing className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold">{gradeAlertBanner.message}</span>
                  {gradeAlertBanner.detail && (
                    <span className="ml-2 text-[11px] opacity-85">({gradeAlertBanner.detail})</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGradeAlertBanner(null)}
                className="p-1 rounded-md hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 cursor-pointer shrink-0"
                aria-label="ปิดข้อความแจ้งเตือน"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Add New Student Grade Form */}
          {showAddGradeForm && onAddGrade && studentsWithoutGradeInCourse.length > 0 && (
            <form
              onSubmit={handleCreateGradeRecord}
              className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-card-subtle)] p-2.5 space-y-2 print:hidden"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>เพิ่มและบันทึกคะแนนนักเรียนใหม่ในรายวิชา {selectedCourse.code}</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={addStudentSearchTerm}
                    onChange={(e) => setAddStudentSearchTerm(e.target.value)}
                    placeholder="ค้นหานักเรียนที่จะเพิ่ม..."
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs text-[var(--color-text-title)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddGradeForm(false)}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                <label className="sm:col-span-2">
                  <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                    นักเรียน ({filteredAddCandidates.length} คน)
                  </span>
                  <select
                    required
                    value={newGradeStudentId}
                    onChange={(e) => setNewGradeStudentId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs text-[var(--color-text-title)]"
                  >
                    <option value="">-- เลือกนักเรียน --</option>
                    {filteredAddCandidates.map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.studentIdNumber} · {stu.firstNameTh} {stu.lastNameTh} ({stu.gradeLevel} {stu.room})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">กลางภาค (30)</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={newMidtermScore}
                    onChange={(e) => setNewMidtermScore(clampScore(Number(e.target.value), 30))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-xs font-mono text-center text-[var(--color-text-title)]"
                  />
                </label>
                <label>
                  <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">ปลายภาค (40)</span>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={newFinalScore}
                    onChange={(e) => setNewFinalScore(clampScore(Number(e.target.value), 40))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-xs font-mono text-center text-[var(--color-text-title)]"
                  />
                </label>
                <label>
                  <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">การบ้าน (20)</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={newAssignmentScore}
                    onChange={(e) => setNewAssignmentScore(clampScore(Number(e.target.value), 20))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-xs font-mono text-center text-[var(--color-text-title)]"
                  />
                </label>
                <label>
                  <span className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">ควิซ (10)</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newQuizScore}
                    onChange={(e) => setNewQuizScore(clampScore(Number(e.target.value), 10))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-xs font-mono text-center text-[var(--color-text-title)]"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="text-[var(--color-text-muted)]">
                  คะแนนรวม:{' '}
                  <strong className="font-mono text-[var(--color-text-title)]">
                    {clampScore(newMidtermScore + newFinalScore + newAssignmentScore + newQuizScore, 100)}/100
                  </strong>
                </span>
                <button
                  type="submit"
                  disabled={!newGradeStudentId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>บันทึกและแจ้งเตือนผู้ปกครอง</span>
                </button>
              </div>
            </form>
          )}

          {/* DESKTOP & TABLET VIEW: Wide Multi-column Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table-comfortable gradebook-score-table w-full text-left text-sm">
              <thead className="bg-[var(--color-card-subtle)] text-sm md:text-base text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Room</th>
                  <th className="py-3 px-3 text-center">เวลาเรียน (80%)</th>
                  <th className="py-3 px-3 text-center">Midterm (30 · {normalizedWeightPercents.midterm}%)</th>
                  <th className="py-3 px-3 text-center">Final (40 · {normalizedWeightPercents.final}%)</th>
                  <th className="py-3 px-3 text-center">Homework (20 · {normalizedWeightPercents.assignment}%)</th>
                  <th className="py-3 px-3 text-center">Quiz (10 · {normalizedWeightPercents.quiz}%)</th>
                  <th className={`py-3 px-3 text-center font-bold ${isPrimaryCourse ? 'text-sky-700 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/30' : 'text-[var(--color-text-title)]'}`}>
                    {isPrimaryCourse ? 'Raw Score / 100 (%)' : 'Total (100)'}
                  </th>
                  <th className="py-3 px-3 text-center font-bold text-[var(--color-primary-text)]">
                    {isPrimaryCourse ? 'Feedback (พัฒนาการรายปี)' : 'Grade'}
                  </th>
                  <th className="py-3 px-3 text-right w-16">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredGradebookRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-4">
                      <EmptyState
                        compact
                        icon={Award}
                        title={gradebookRows.length === 0 ? 'ยังไม่มีข้อมูลผลการเรียนในรายวิชานี้' : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'}
                        description="ลองปรับคำค้นหา ตัวกรองห้อง หรือเลือกรายวิชาอื่น"
                      />
                    </td>
                  </tr>
                ) : (
                  filteredGradebookRows.map(({ grade, student, eligibility }, index) => {
                    const isVisible = index >= currentGradePage * gradePageSize && index < (currentGradePage + 1) * gradePageSize;
                    return (
                      <tr key={grade.id} className={`${isVisible ? '' : 'hidden'} hover:bg-[var(--color-card-subtle)] transition-colors`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={student.avatarUrl}
                              alt={student.firstNameEn}
                              className="w-7 h-7 rounded-full object-cover border border-[var(--color-border)]"
                            />
                            <div>
                              <div className="font-semibold text-[var(--color-text-title)]">
                                {student.firstNameEn} {student.lastNameEn}
                              </div>
                              <div className="text-[10px] text-[var(--color-text-muted)] font-thai">
                                {student.firstNameTh} ({student.studentIdNumber})
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-[var(--color-text-body)]">
                          {student.room}
                        </td>

                        <td className="py-3 px-3 text-center tabular-nums">
                          {eligibility.isAtRiskMs ? (
                            <span
                              title={`เข้าเรียน ${eligibility.attendedHours}/${eligibility.totalScheduledHours} ชม. (ต่ำกว่า 80% เสี่ยง มส.)`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 text-[10px] font-bold"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              มส. ({eligibility.attendancePercent}%)
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              {eligibility.attendancePercent}% ({eligibility.attendedHours}/{eligibility.totalScheduledHours} ชม.)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            disabled={!effectiveCanEditGrades}
                            value={grade.midtermScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'midtermScore', Number(e.target.value))
                            }
                            onBlur={() => flushPendingGradeAlert(grade.id)}
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold disabled:opacity-60 focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="40"
                            disabled={!effectiveCanEditGrades}
                            value={grade.finalScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'finalScore', Number(e.target.value))
                            }
                            onBlur={() => flushPendingGradeAlert(grade.id)}
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold disabled:opacity-60 focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            disabled={!effectiveCanEditGrades}
                            value={grade.assignmentScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'assignmentScore', Number(e.target.value))
                            }
                            onBlur={() => flushPendingGradeAlert(grade.id)}
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold disabled:opacity-60 focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            disabled={!effectiveCanEditGrades}
                            value={grade.quizScore}
                            onChange={(e) =>
                              handleScoreChange(grade, 'quizScore', Number(e.target.value))
                            }
                            onBlur={() => flushPendingGradeAlert(grade.id)}
                            className="w-14 px-1.5 py-1 text-center rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono font-semibold disabled:opacity-60 focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        <td className={`py-3 px-3 text-center font-mono font-bold tabular-nums ${isPrimaryCourse ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''}`}>
                          {(() => {
                            const live = computeLiveObecGrade(grade);
                            return (
                              <>
                                {isPrimaryCourse ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-base font-extrabold text-sky-700 dark:text-sky-300">{live.totalScore}%</span>
                                    <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">({live.totalScore} / 100)</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm text-[var(--color-text-title)]">{live.totalScore}</div>
                                    <div className="text-[10px] font-normal text-[var(--color-text-muted)]">{live.totalScore}%</div>
                                  </>
                                )}
                                {live.totalScore !== grade.totalScore && (
                                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                    เดิม {grade.totalScore}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {(() => {
                            const disp = computeLiveObecGrade(grade);
                            const feedback = getRawScoreFeedback(disp.totalScore);
                            const currentSpecialValue =
                              grade.letterGrade === 'ร' ||
                              grade.letterGrade === 'มส.' ||
                              grade.letterGrade === 'ผ' ||
                              grade.letterGrade === 'มผ'
                                ? grade.letterGrade
                                : 'auto';
                            return (
                              <div className="inline-flex flex-col items-center gap-1">
                                {isPrimaryCourse ? (
                                  disp.isSpecial ? (
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs border ${
                                        disp.letter === 'ร' || disp.letter === 'มส.' || disp.letter === 'มผ'
                                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                      }`}
                                    >
                                      {disp.letter}
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${feedback.badgeClass}`}>
                                        {feedback.labelTh}
                                      </span>
                                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                        ผลรายปี: {disp.letter}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs border ${
                                      disp.letter === 'ร' || disp.letter === 'มส.' || disp.letter === 'มผ' || disp.letter === '0' || disp.letter === 'F'
                                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                        : disp.point >= 3.5 || disp.letter === 'ผ'
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                        : disp.point >= 2.5
                                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                                        : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                    }`}
                                  >
                                    {disp.isSpecial ? disp.letter : `${disp.letter} (${disp.point.toFixed(1)})`}
                                  </span>
                                )}
                                {disp.letter !== disp.savedLetter && (
                                  <span className="text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-300">
                                    เดิม {disp.savedLetter} → {disp.letter}
                                  </span>
                                )}
                                <select
                                  aria-label={`สถานะเกรด ปพ.5 ของ ${student.firstNameTh}`}
                                  value={currentSpecialValue}
                                  onChange={(e) =>
                                    handleSpecialStatusChange(
                                      grade,
                                      e.target.value as 'auto' | 'ร' | 'มส.' | 'ผ' | 'มผ'
                                    )
                                  }
                                  className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[10px] text-[var(--color-text-muted)] cursor-pointer"
                                >
                                  <option value="auto">{courseIsActivity ? 'อัตโนมัติ (ผ/มผ)' : 'ปกติ (คิดเกรด)'}</option>
                                  <option value="ร">ร (รอตัดสิน)</option>
                                  <option value="มส.">มส. (ไม่มีสิทธิ์สอบ)</option>
                                  {courseIsActivity && (
                                    <>
                                      <option value="ผ">ผ (ผ่านกิจกรรม)</option>
                                      <option value="มผ">มผ (ไม่ผ่านกิจกรรม)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {(() => {
                            const actionItems: TableActionItem[] = [
                              {
                                id: 'moe_hub',
                                label: 'งานทะเบียน & ออกเอกสาร สพฐ. (ปพ.1–8)',
                                icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
                                variant: 'primary',
                                onClick: () => openStudentInRegistry(student.id, 'pp1'),
                              },
                              {
                                id: 'transcript',
                                label: 'ดูใบรายงานผล (Transcript / ปพ.6)',
                                icon: <FileText className="w-3.5 h-3.5" />,
                                onClick: () => onOpenReportCard(student),
                              },
                              {
                                id: 'notify_grade',
                                label: 'ส่งแจ้งเตือนผลการเรียน LINE/แอป',
                                icon: <BellRing className="w-3.5 h-3.5" />,
                                onClick: () => void triggerGradeAlertNow(grade, false, true),
                              },
                              ...(onPracticeInAi && grade.totalScore < 65
                                ? [
                                    {
                                      id: 'ai_remedial',
                                      label: 'ส่งฝึกซ่อมเสริม AI Socratic',
                                      icon: <Sparkles className="w-3.5 h-3.5" />,
                                      variant: 'warning' as const,
                                      dividerBefore: true,
                                      onClick: () =>
                                        onPracticeInAi({
                                          subject: selectedCourse.titleTh,
                                          topicTh: `${selectedCourse.code} ${selectedCourse.titleTh}`,
                                          studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                          score: grade.totalScore,
                                          targetTab: 'socratic_tutor',
                                        }),
                                    },
                                  ]
                                : []),
                              ...(effectiveCanEditGrades && onDeleteGrade
                                ? [
                                    {
                                      id: 'delete_grade',
                                      label: 'ลบคะแนนรายวิชานี้ออก',
                                      icon: <Trash2 className="w-3.5 h-3.5" />,
                                      variant: 'danger' as const,
                                      dividerBefore: true,
                                      onClick: () =>
                                        setPendingDeleteGrade({
                                          grade,
                                          studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                        }),
                                    },
                                  ]
                                : []),
                            ];
                            return (
                              <TableActionMenu
                                items={actionItems}
                                ariaLabel={`จัดการผลการเรียน ${student.firstNameTh} ${student.lastNameTh}`}
                              />
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2.5">
            {filteredGradebookRows.length === 0 ? (
              <EmptyState
                compact
                icon={Award}
                title={gradebookRows.length === 0 ? 'ไม่มีข้อมูลผลการเรียนในรายวิชานี้' : 'ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก'}
              />
            ) : (
              filteredGradebookRows.map(({ grade, student }, index) => {
                const isVisible = index >= currentGradePage * gradePageSize && index < (currentGradePage + 1) * gradePageSize;
                if (!isVisible) return null;

                return (
                  <div key={grade.id} className="p-3 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] shadow-sm space-y-2.5">
                    {/* Student Info Top */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={student.avatarUrl}
                          alt={student.firstNameEn}
                          className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--color-text-title)] truncate">
                            {student.firstNameTh} {student.lastNameTh}
                          </h4>
                          <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {student.studentIdNumber} • ห้อง {student.room}
                          </p>
                        </div>
                      </div>

                      {/* Total Score & Feedback/Grade Badge (Real-time Weighted) */}
                      <div className="text-right shrink-0 tabular-nums">
                        {(() => {
                          const disp = computeLiveObecGrade(grade);
                          const feedback = getRawScoreFeedback(disp.totalScore);
                          return (
                            <>
                              {isPrimaryCourse ? (
                                <div className="text-base font-extrabold font-mono text-sky-700 dark:text-sky-300">
                                  {disp.totalScore}% <span className="text-[10px] font-normal text-[var(--color-text-muted)]">({disp.totalScore}/100)</span>
                                </div>
                              ) : (
                                <div className="text-base font-bold font-mono text-[var(--color-text-title)]">
                                  {disp.totalScore} <span className="text-[10px] font-normal text-[var(--color-text-muted)]">/ 100 ({disp.totalScore}%)</span>
                                </div>
                              )}
                              {isPrimaryCourse && !disp.isSpecial ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${feedback.badgeClass}`}>
                                  {feedback.labelTh} (ผลรายปี {disp.letter})
                                </span>
                              ) : (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                    disp.letter === 'ร' || disp.letter === 'มส.' || disp.letter === 'มผ' || disp.letter === '0' || disp.letter === 'F'
                                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                      : disp.point >= 3.5 || disp.letter === 'ผ'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                      : disp.point >= 2.5
                                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border-[var(--color-border)]'
                                      : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  }`}
                                >
                                  {disp.isSpecial ? disp.letter : `เกรด ${disp.letter}`}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Touch Friendly Score Inputs Grid */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">กลางภาค</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          disabled={!effectiveCanEditGrades}
                          value={grade.midtermScore}
                          onChange={(e) => handleScoreChange(grade, 'midtermScore', Number(e.target.value))}
                          onBlur={() => flushPendingGradeAlert(grade.id)}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent disabled:opacity-60 focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 30)</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">ปลายภาค</span>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          disabled={!effectiveCanEditGrades}
                          value={grade.finalScore}
                          onChange={(e) => handleScoreChange(grade, 'finalScore', Number(e.target.value))}
                          onBlur={() => flushPendingGradeAlert(grade.id)}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent disabled:opacity-60 focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 40)</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">การบ้าน</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={!effectiveCanEditGrades}
                          value={grade.assignmentScore}
                          onChange={(e) => handleScoreChange(grade, 'assignmentScore', Number(e.target.value))}
                          onBlur={() => flushPendingGradeAlert(grade.id)}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent disabled:opacity-60 focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 20)</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-center">
                        <span className="block text-[9px] text-[var(--color-text-muted)] font-medium">ควิซ</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          disabled={!effectiveCanEditGrades}
                          value={grade.quizScore}
                          onChange={(e) => handleScoreChange(grade, 'quizScore', Number(e.target.value))}
                          onBlur={() => flushPendingGradeAlert(grade.id)}
                          className="w-full text-center text-xs font-mono font-bold text-[var(--color-text-title)] bg-transparent disabled:opacity-60 focus:outline-none focus:text-[var(--color-primary-text)] mt-0.5"
                        />
                        <span className="block text-[8px] text-[var(--color-text-muted)] font-mono">(เต็ม 10)</span>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-end pt-1">
                      <TableActionMenu
                        triggerLabel="จัดการ"
                        ariaLabel={`จัดการผลการเรียน ${student.firstNameTh} ${student.lastNameTh}`}
                        items={[
                          {
                            id: 'moe_hub',
                            label: 'งานทะเบียน & ออกเอกสาร สพฐ. (ปพ.1–8)',
                            icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
                            variant: 'primary',
                            onClick: () => openStudentInRegistry(student.id, 'pp1'),
                          },
                          {
                            id: 'transcript',
                            label: 'ดูใบรายงานผล (Transcript / ปพ.6)',
                            icon: <FileText className="w-3.5 h-3.5" />,
                            onClick: () => onOpenReportCard(student),
                          },
                          {
                            id: 'notify_grade',
                            label: 'ส่งแจ้งเตือนผลการเรียน LINE/แอป',
                            icon: <BellRing className="w-3.5 h-3.5" />,
                            onClick: () => void triggerGradeAlertNow(grade, false, true),
                          },
                          ...(onPracticeInAi && grade.totalScore < 65
                            ? [
                                {
                                  id: 'ai_remedial',
                                  label: 'ส่งฝึกซ่อมเสริม AI Socratic',
                                  icon: <Sparkles className="w-3.5 h-3.5" />,
                                  variant: 'warning' as const,
                                  dividerBefore: true,
                                  onClick: () =>
                                    onPracticeInAi({
                                      subject: selectedCourse.titleTh,
                                      topicTh: `${selectedCourse.code} ${selectedCourse.titleTh}`,
                                      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                      score: grade.totalScore,
                                      targetTab: 'socratic_tutor',
                                    }),
                                },
                              ]
                            : []),
                          ...(effectiveCanEditGrades && onDeleteGrade
                            ? [
                                {
                                  id: 'delete_grade',
                                  label: 'ลบคะแนนรายวิชานี้ออก',
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  variant: 'danger' as const,
                                  dividerBefore: true,
                                  onClick: () =>
                                    setPendingDeleteGrade({
                                      grade,
                                      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
                                    }),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {renderPageControls(currentGradePage, filteredGradebookRows.length, gradePageSize, setGradePage, 'Gradebook pages')}
          </div>
        </div>
      )}

      {/* 3-Semester Achievement Trend Comparison Chart inside GradebookView */}
      {activeTab === 'gradebook' && !isPersonalGradeViewer && (
        <ThreeSemesterAchievementTrendChart
          grades={grades}
          courses={courses}
          students={students}
          selectedCourse={selectedCourse}
          filteredCourseGrades={filteredGradebookRows.map((row) => row.grade)}
          systemConfig={systemConfig}
          lang={lang}
          selectedStudentId={selectedStudentIdForPp6}
          onSelectStudent={setSelectedStudentIdForPp6}
          onOpenStudentDevBook={onOpenStudentDevBook}
        />
      )}

      {/* ========================================================
          TAB 2: เอกสาร ปพ.5 (สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียนประจำวิชา)
          ======================================================== */}
      {activeTab === 'pp5' && selectedCourse && (
        <Pp5OfficialForm
          selectedCourse={selectedCourse}
          students={students}
          courseGrades={courseGrades}
          systemConfig={systemConfig}
          school={school}
          timetableSlots={timetableSlots}
          attendance={attendance}
          periodAttendance={periodAttendance}
          currentPp5Page={currentPp5Page}
          pp5PageSize={pp5PageSize}
          setPp5Page={setPp5Page}
          compactToolbar={embeddedInStudentManagement}
          searchQuery={studentSearchTerm}
          renderPageControls={renderPageControls}
        />
      )}

      {/* ========================================================
          TAB: สรุปคะแนนและเกรดเฉลี่ยรายวิชาพื้นฐาน ปพ.5 รายห้องอัตโนมัติ
          ======================================================== */}
      {activeTab === 'pp5_core_summary' && !isPersonalGradeViewer && (
        <Pp5CoreRoomSummaryView
          students={students}
          courses={courses}
          grades={grades}
          systemConfig={systemConfig}
          school={school}
          lang={lang}
          onOpenCoursePp5={(courseId) => {
            setSelectedCourseId(courseId);
            setActiveTab('pp5');
          }}
        />
      )}

      {/* ========================================================
          TAB: ตัวชี้วัดตามมาตรฐานการเรียนรู้
          ======================================================== */}
      {activeTab === 'indicators' && selectedCourse && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 print:overflow-visible">
          <LearningIndicatorAssessmentPanel
            course={selectedCourse}
            students={students}
            school={school}
            systemConfig={systemConfig}
            currentRole={currentRole}
            currentUserName={currentUser?.fullNameTh}
            grades={grades}
            gradingSystem={systemConfig.gradingSystem}
            onUpdateGrade={effectiveCanEditGrades ? onUpdateGrade : undefined}
            onAddGrade={effectiveCanEditGrades ? onAddGrade : undefined}
          />
        </div>
      )}

      {/* ========================================================
          TAB 3: เอกสาร ปพ.6 (สมุดรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล)
          ======================================================== */}
      {activeTab === 'pp6' && (
        <Pp6OfficialForm
          students={students}
          courses={courses}
          grades={grades}
          attendance={attendance}
          systemConfig={systemConfig}
          school={school}
          selectedStudentIdForPp6={selectedStudentIdForPp6}
          setSelectedStudentIdForPp6={setSelectedStudentIdForPp6}
          currentPp6CoursePage={currentPp6CoursePage}
          pp6CoursePageSize={pp6CoursePageSize}
          setPp6CoursePage={setPp6CoursePage}
          renderPageControls={renderPageControls}
        />
      )}

      {/* ========================================================
          TAB: Report Card วิชาพื้นฐาน (เชื่อมสมุดพัฒนาฯ & ปพ.5/6)
          ======================================================== */}
      {activeTab === 'core_report_card' && !isPersonalGradeViewer && (
        <CoreSubjectsReportCardView
          students={students}
          courses={courses}
          grades={grades}
          attendance={attendance}
          periodAttendance={periodAttendance}
          timetableSlots={timetableSlots}
          behaviorRecords={behaviorRecords}
          sdqAssessments={sdqAssessments}
          systemConfig={systemConfig}
          school={school}
          initialStudentId={initialStudentId || selectedStudentIdForPp6}
          lang={lang}
          onOpenStudentDevBook={onOpenStudentDevBook}
        />
      )}

      {/* ========================================================
          TAB: สรุปคุณลักษณะอันพึงประสงค์ & การอ่าน คิดวิเคราะห์ เขียน รายชั้นปี
          ======================================================== */}
      {activeTab === 'qualitative_summary' && !isPersonalGradeViewer && (
        <GradeLevelQualitativeSummaryView
          students={students}
          systemConfig={systemConfig}
          school={school}
          currentRole={currentRole}
          currentUser={currentUser}
          lang={lang}
          onOpenStudentDevBook={onOpenStudentDevBook}
          onOpenStudentPp6={(studentId) => openStudentInRegistry(studentId, 'pp6')}
        />
      )}

      {/* ========================================================
          ปพ.3 ออนไลน์: แบบรายงานผู้สำเร็จการศึกษา (ป.6, ม.3, ม.6)
         ======================================================== */}
      {activeTab === 'pp3_online' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3 sm:p-4 shadow-xs overflow-y-auto space-y-3 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:overflow-visible">
          {/* Official Print Header (also serves as formal MOE document header) */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-2">
            <div className="flex items-center justify-center gap-3">
              {school?.logoUrl && <img src={school.logoUrl} alt="ตราโรงเรียน" className="w-14 h-14 object-contain" />}
              <div>
                <p className="text-xs font-bold">ทะเบียนเตรียมข้อมูลสำหรับจัดทำแบบรายงานผู้สำเร็จการศึกษา (ปพ.๓)</p>
                <h2 className="text-lg font-extrabold">โรงเรียน{school?.nameTh || systemConfig.schoolNameTh}</h2>
              </div>
            </div>
            <p className="text-xs">ปีการศึกษา {systemConfig.academicYear} • ระดับชั้น: {pp3LevelFilter === 'all' ? 'ทั้งหมด' : pp3LevelFilter.toUpperCase()}</p>
            <p className="text-[10px]">เอกสารเตรียมตรวจ ไม่ใช่แบบ ปพ.๓ ทางราชการที่รับรองแล้ว</p>
          </div>

          {/* Compact Header, Search & Level Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5 print:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 shrink-0">
                ปพ.3 เตรียมข้อมูล
              </span>
              <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                แบบรายงานผู้สำเร็จการศึกษา ({pp3EligibleStudents.length} คน)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
              <div className="relative w-full sm:w-52">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อ รหัส ปชช. ห้อง..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-6 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                />
                {studentSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={pp3RoomFilter}
                onChange={(e) => setPp3RoomFilter(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1.5 text-xs text-[var(--color-text-title)]"
              >
                <option value="all">ทุกห้อง</option>
                {pp3RoomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <div className="flex items-center gap-1 bg-[var(--color-card-subtle)] p-0.5 rounded-lg border border-[var(--color-border)] shrink-0">
                {([
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'p6', label: 'ป.6' },
                  { id: 'm3', label: 'ม.3' },
                  { id: 'm6', label: 'ม.6' },
                ] as const).map((lv) => (
                  <button
                    key={lv.id}
                    type="button"
                    onClick={() => {
                      setPp3LevelFilter(lv.id);
                      setPp3RoomFilter('all');
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      pp3LevelFilter === lv.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    {lv.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
            <table className="table-comfortable w-full text-xs text-left">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">ลำดับ</th>
                  <th className="py-2 px-3">เลขประจำตัวนักเรียน</th>
                  <th className="py-2 px-3">เลขประจำตัวประชาชน (13 หลัก DMC)</th>
                  <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2 px-3">ระดับชั้น</th>
                  <th className="py-2 px-3 text-center">GPAX / ร้อยละสะสม</th>
                  <th className="py-2 px-3">เลขที่ชุด / เล่มที่ ปพ.3</th>
                  <th className="py-2 px-3 text-center">สถานะอนุมัติ</th>
                  <th className="py-2 px-3 text-right w-16">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pp3EligibleStudents.map((stu, idx) => {
                  const summary = calculateStudentAcademicSummary({
                    student: stu,
                    courses,
                    grades,
                    gradingSystem: systemConfig.gradingSystem,
                  });
                  const regMap = loadSchoolRegistryMap(school?.id || 'default');
                  const signers = loadSchoolRegistrySigners(school?.id || 'default');
                  const reg = getStudentRegistryRecord(regMap, stu, signers);
                  const pp3Meta = getPp3ApprovalStatusMeta(reg.pp3ApprovalStatus);
                  const hasRealGpa = summary.hasRecordedGrades && summary.gpax !== null;
                  const effectiveGpax = hasRealGpa && summary.gpax !== null ? summary.gpax : 0;
                  const primaryFeedback = getRawScoreFeedback(summary.averageRawScore);
                  return (
                    <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="py-2 px-3 text-center font-mono text-[var(--color-text-muted)]">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[var(--color-primary-text)]">{stu.studentIdNumber}</td>
                      <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{stu.nationalId || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-[var(--color-text-title)]">
                        {getStudentShortPrefixTh(stu)} {stu.firstNameTh} {stu.lastNameTh}
                        <div className="text-[10px] text-[var(--color-text-muted)] font-normal">{stu.firstNameEn} {stu.lastNameEn}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-medium">
                          {stu.gradeLevel} ({stu.room})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {summary.hideGpaCalculations ? (
                          summary.averageRawScore !== null ? (
                            <div>
                              <span>{summary.averageRawScore}%</span>
                              <span className="block text-[10px] text-[var(--color-text-muted)]">
                                {primaryFeedback.labelTh} (รายปี)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">รอประเมิน (รายปี)</span>
                          )
                        ) : hasRealGpa ? (
                          effectiveGpax.toFixed(2)
                        ) : (
                          <span className="text-[var(--color-text-muted)] font-normal">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">
                        {reg.pp3SetNo || reg.pp3BookNo ? (
                          <>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              ชุด {reg.pp3SetNo || '-'} / เล่ม {reg.pp3BookNo || '-'}
                            </span>
                            {reg.graduationDate && (
                              <span className="text-[10px] text-[var(--color-text-muted)] block">
                                อนุมัติ: {reg.graduationDate}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">ยังไม่กำหนด</span>
                            <span className="text-[10px] text-[var(--color-text-muted)] block">แก้ไขได้ที่ศูนย์เอกสาร สพฐ.</span>
                          </>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${pp3Meta.toneClass}`}>
                          {pp3Meta.labelTh}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <TableActionMenu
                          ariaLabel={`จัดการรายงาน ปพ. ของ ${stu.firstNameTh} ${stu.lastNameTh}`}
                          items={[
                            {
                              id: 'moe_hub',
                              label: 'ออกเอกสาร สพฐ. & บันทึกเลข ปพ.3',
                              icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
                              variant: 'primary',
                              onClick: () => openStudentInRegistry(stu.id, 'pp3'),
                            },
                            {
                              id: 'pp1',
                              label: 'ดู & พิมพ์ ปพ.1 (ระเบียนผลการเรียน)',
                              icon: <FileText className="w-3.5 h-3.5" />,
                              onClick: () => openStudentInRegistry(stu.id, 'pp1'),
                            },
                            {
                              id: 'pp6',
                              label: 'ดู & พิมพ์ ปพ.6 ประจำตัว',
                              icon: <Award className="w-3.5 h-3.5" />,
                              onClick: () => openStudentInRegistry(stu.id, 'pp6'),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Pp.3 Certification Signature Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-[var(--color-border)] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] text-xs text-center bg-[var(--color-card-subtle)] print:bg-white print:border-slate-700 print:divide-slate-700">
            <div className="p-3 space-y-6">
              <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">นายทะเบียนโรงเรียน</p>
              <div>
                <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>
            <div className="p-3 space-y-6">
              <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">หัวหน้าฝ่ายวิชาการ / วัดผล</p>
              <div>
                <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">วันที่ ....... / ............ / ...........</p>
              </div>
            </div>
            <div className="p-3 space-y-6">
              <p className="font-bold text-[var(--color-text-title)] print:text-slate-900">ผู้อำนวยการสถานศึกษา (ผู้อนุมัติจบ)</p>
              <div>
                <div className="border-b border-dotted border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="text-[11px] text-[var(--color-text-muted)] print:text-slate-700">วันที่อนุมัติ ....... / ............ / ...........</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          สทศ. O-NET: ระบบส่งข้อมูลสอบระดับชาติและการประเมินผล
         ======================================================== */}
      {activeTab === 'onet_niets' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3 sm:p-4 shadow-xs overflow-y-auto space-y-3">
          {/* Header, Search & Level Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary-text)] shrink-0">
                สทศ. O-NET
              </span>
              <h2 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                ข้อมูลสอบระดับชาติ ({onetRows.length} คน · เฉลี่ย {onetOverallAverage ? `${onetOverallAverage}%` : '—'})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
              <div className="relative w-full sm:w-52">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อ รหัส ปชช. ห้อง..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] py-1.5 pl-8 pr-6 text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
                />
                {studentSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={onetRoomFilter}
                onChange={(e) => setOnetRoomFilter(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-1.5 text-xs text-[var(--color-text-title)]"
              >
                <option value="all">ทุกห้อง</option>
                {onetRoomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <div className="flex items-center gap-1 bg-[var(--color-card-subtle)] p-0.5 rounded-lg border border-[var(--color-border)] shrink-0">
                {(['p6', 'm3', 'm6'] as const).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => {
                      setOnetLevelFilter(lv);
                      setOnetRoomFilter('all');
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      onetLevelFilter === lv
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
                    }`}
                  >
                    {lv === 'p6' ? 'ป.6' : lv === 'm3' ? 'ม.3' : 'ม.6'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* O-NET Data Table */}
          <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
            <table className="table-comfortable w-full text-xs text-left">
              <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                <tr>
                  <th className="py-2.5 px-3">เลขที่นั่งสอบ</th>
                  <th className="py-2.5 px-3">เลขประจำตัวประชาชน (13 หลัก)</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">ภาษาไทย (100)</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">คณิตศาสตร์ (100)</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">วิทยาศาสตร์ (100)</th>
                  <th className="py-2.5 px-3 text-center bg-[var(--color-primary-light)]">ภาษาอังกฤษ (100)</th>
                  <th className="py-2.5 px-3 text-center font-bold">เฉลี่ยรวม</th>
                  <th className="py-2.5 px-3 text-center">สถานะ สทศ.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {onetRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[var(--color-text-muted)]">
                      ไม่พบรายชื่อนักเรียนระดับ {onetLevelFilter.toUpperCase()} ในโรงเรียนนี้
                    </td>
                  </tr>
                ) : (
                  onetRows.map(({ stu, nationalId, seatNo, thScore, mathScore, sciScore, engScore, avgNumber }) => (
                    <tr key={stu.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary-text)]">{seatNo}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{nationalId}</td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-text-title)]">
                        {getStudentShortPrefixTh(stu)} {stu.firstNameTh} {stu.lastNameTh}
                        <div className="text-[10px] text-[var(--color-text-muted)]">{stu.gradeLevel} ({stu.room})</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">{thScore}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">{mathScore}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">{sciScore}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">{engScore}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[var(--color-primary-text)] bg-[var(--color-primary-light)]">
                        {avgNumber.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[var(--color-primary-text)]" />
                          นำส่ง สทศ. แล้ว
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ศูนย์ทะเบียน & ออกเอกสาร สพฐ. รายบุคคล (ปพ.1–ปพ.8)
         ======================================================== */}
      {activeTab === 'moe_student_hub' && !isPersonalGradeViewer && (
        <MoeStudentDocumentCenter
          students={students}
          courses={courses}
          grades={grades}
          attendance={attendance}
          periodAttendance={periodAttendance}
          timetableSlots={timetableSlots}
          behaviorRecords={behaviorRecords}
          sdqAssessments={sdqAssessments}
          infirmaryVisits={infirmaryVisits}
          systemConfig={systemConfig}
          school={school}
          currentRole={currentRole}
          currentUser={currentUser}
          selectedStudentId={selectedStudentIdForPp6}
          onSelectStudentId={(sid) => setSelectedStudentIdForPp6(sid)}
          onAddStudent={onAddStudent}
          onUpdateStudent={onUpdateStudent}
          onDeleteStudent={onDeleteStudent}
          onUpdateGrade={onUpdateGrade}
          onAddGrade={onAddGrade}
          onDeleteGrade={onDeleteGrade}
          onOpenStudentDevBook={onOpenStudentDevBook}
          initialDocView={hubDocViewOverride}
          canEdit={effectiveCanEditGrades}
          lang={lang}
        />
      )}
      </div>

      {/* Confirm Delete Course Grade Modal */}
      {pendingDeleteGrade && (
        <ConfirmActionModal
          isOpen={true}
          title="ยืนยันลบรายการคะแนนรายวิชา"
          description={`ต้องการลบคะแนนวิชา ${selectedCourse?.code || ''} ของ ${pendingDeleteGrade.studentName} ออกจากสมุดคะแนนหรือไม่?`}
          detailNote="คะแนนและเกรดรายวิชานี้จะถูกลบออกจากฐานข้อมูล และระบบจะคำนวณ GPA เฉลี่ยใหม่ให้อัตโนมัติ"
          confirmLabel={isDeletingGrade ? 'กำลังลบ...' : 'ยืนยันลบคะแนน'}
          tone="danger"
          isBusy={isDeletingGrade}
          onCancel={() => !isDeletingGrade && setPendingDeleteGrade(null)}
          onConfirm={async () => {
            if (!onDeleteGrade) return;
            setIsDeletingGrade(true);
            try {
              await onDeleteGrade(pendingDeleteGrade.grade.id);
              setPendingDeleteGrade(null);
            } finally {
              setIsDeletingGrade(false);
            }
          }}
        />
      )}
    </div>
  );
};
