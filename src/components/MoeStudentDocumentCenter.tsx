import React, { useEffect, useMemo, useState } from 'react';
import {
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  Course,
  GradeRecord,
  InfirmaryVisit,
  PeriodAttendanceRecord,
  School,
  SdqAssessment,
  Student,
  StudentStatus,
  SystemConfig,
  TimetableSlot,
  UserRole,
} from '../types';
import {
  Check,
  CheckCircle2,
  Database,
  Download,
  Edit3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Printer,
  Save,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import {
  buildMoeDocumentHtml,
  buildStudentMoeDossier,
  downloadMoeDocumentPdf,
  exportStudentMoeCsv,
  exportStudentMoeJson,
  MOE_OFFICIAL_DOCUMENTS,
  MoeDocumentType,
  PP7_PURPOSE_OPTIONS,
  printMoeBundleDocuments,
  printMoeDocument,
} from '../lib/moeOfficialDocs';
import {
  createDefaultStudentRegistryRecord,
  getStudentRegistryRecord,
  loadSchoolRegistryMap,
  loadSchoolRegistrySigners,
  mergeRegistryFieldsIntoStudent,
  Pp3ApprovalStatus,
  saveSchoolRegistrySigners,
  saveStudentRegistryAndQualitativeToDb,
  StudentRegistryRecord,
} from '../lib/studentRegistryStore';
import {
  createDefaultStudentQualitative,
  getStudentQualitativeRecord,
  loadQualitativeAssessments,
  StudentQualitativeAssessment,
  summarizeStudentQualitative,
} from '../lib/moeQualitativeStore';
import {
  MOE_DESIRABLE_ATTRIBUTES_RUBRIC,
  MOE_KEY_COMPETENCIES,
  MOE_READING_WRITING_RUBRIC,
  MOE_STUDENT_ACTIVITIES,
} from '../data/moeCurriculumStandards';
import { calculateGrade } from '../lib/schoolSettings';
import { ALL_GRADE_LEVELS, STUDENT_STATUS_DETAILS } from '../data/studentAcademicData';
import { getStudentShortPrefixTh } from '../lib/moeGrading';

interface MoeStudentDocumentCenterProps {
  students: Student[];
  courses: Course[];
  grades: GradeRecord[];
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  timetableSlots?: TimetableSlot[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  infirmaryVisits?: InfirmaryVisit[];
  systemConfig: SystemConfig;
  school?: School;
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  selectedStudentId?: string;
  onSelectStudentId?: (studentId: string) => void;
  onUpdateStudent?: (student: Student) => void;
  onUpdateGrade?: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade?: (grade: GradeRecord, options?: { notify?: boolean }) => void;
  canEdit?: boolean;
}

interface EditableGradeDraft {
  id?: string;
  courseId: string;
  midtermScore: number;
  finalScore: number;
  assignmentScore: number;
  quizScore: number;
}

export const MoeStudentDocumentCenter: React.FC<MoeStudentDocumentCenterProps> = ({
  students,
  courses,
  grades,
  attendance = [],
  periodAttendance = [],
  timetableSlots = [],
  behaviorRecords = [],
  sdqAssessments = [],
  infirmaryVisits = [],
  systemConfig,
  school,
  currentRole = 'teacher',
  currentUser,
  selectedStudentId: controlledStudentId,
  onSelectStudentId,
  onUpdateStudent,
  onUpdateGrade,
  onAddGrade,
  canEdit = true,
}) => {
  const schoolId = school?.id || students[0]?.schoolId || 'default';
  const academicYear = systemConfig.academicYear || '2569';
  const semester = systemConfig.currentSemester || '1';

  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [internalStudentId, setInternalStudentId] = useState<string>(
    controlledStudentId || students[0]?.id || ''
  );
  const activeStudentId = controlledStudentId || internalStudentId || students[0]?.id || '';

  const [workspaceMode, setWorkspaceMode] = useState<'docs' | 'database'>('docs');
  const [activeDocType, setActiveDocType] = useState<MoeDocumentType>('pp1');
  const [pp7Purpose, setPp7Purpose] = useState<string>(PP7_PURPOSE_OPTIONS[0]);
  const [customPp7Purpose, setCustomPp7Purpose] = useState<string>('');
  const [bundleDocsSelected, setBundleDocsSelected] = useState<MoeDocumentType[]>([
    'pp1',
    'pp3',
    'pp5',
    'pp6',
    'pp7',
    'pp8',
  ]);
  const [showBundleModal, setShowBundleModal] = useState(false);

  const [registryMap, setRegistryMap] = useState<Record<string, StudentRegistryRecord>>(() =>
    loadSchoolRegistryMap(schoolId)
  );
  const [qualitativeMap, setQualitativeMap] = useState<Record<string, StudentQualitativeAssessment>>(() =>
    loadQualitativeAssessments(schoolId, academicYear, semester)
  );

  // Editable draft state for selected student
  const [studentDraft, setStudentDraft] = useState<Student | null>(null);
  const [registryDraft, setRegistryDraft] = useState<StudentRegistryRecord | null>(null);
  const [qualDraft, setQualDraft] = useState<StudentQualitativeAssessment | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<EditableGradeDraft[]>([]);
  const [courseToAddId, setCourseToAddId] = useState<string>('');
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setRegistryMap(loadSchoolRegistryMap(schoolId));
  }, [schoolId]);

  useEffect(() => {
    setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
  }, [schoolId, academicYear, semester]);

  useEffect(() => {
    if (controlledStudentId && students.some((s) => s.id === controlledStudentId)) {
      setInternalStudentId(controlledStudentId);
    }
  }, [controlledStudentId, students]);

  const handleChooseStudent = (id: string) => {
    setInternalStudentId(id);
    onSelectStudentId?.(id);
    setStatusBanner(null);
  };

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.room) set.add(s.room);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (roomFilter !== 'all' && s.room !== roomFilter) return false;
        if (!q) return true;
        return [
          s.studentIdNumber,
          s.nationalId,
          `${s.firstNameTh} ${s.lastNameTh}`,
          `${s.firstNameEn} ${s.lastNameEn}`,
          s.gradeLevel,
          s.room,
        ].some((val) => (val || '').toLowerCase().includes(q));
      })
      .sort((a, b) =>
        `${a.room} ${a.studentIdNumber}`.localeCompare(`${b.room} ${b.studentIdNumber}`, 'th')
      );
  }, [students, searchQuery, roomFilter]);

  const selectedStudent =
    students.find((s) => s.id === activeStudentId) ||
    filteredStudents[0] ||
    students[0] ||
    null;

  // Sync draft state whenever selectedStudent or persisted data changes
  useEffect(() => {
    if (!selectedStudent) {
      setStudentDraft(null);
      setRegistryDraft(null);
      setQualDraft(null);
      setGradeDrafts([]);
      return;
    }
    const signers = loadSchoolRegistrySigners(schoolId);
    const reg = getStudentRegistryRecord(registryMap, selectedStudent, signers);
    const qual = getStudentQualitativeRecord(qualitativeMap, selectedStudent.id);

    setStudentDraft({ ...selectedStudent });
    setRegistryDraft(reg);
    setQualDraft(qual);

    const existingGrades = grades.filter((g) => g.studentId === selectedStudent.id);
    const existingByCourse = new Map(existingGrades.map((g) => [g.courseId, g]));
    const enrolledCourses = courses.filter(
      (c) => (c.enrolledStudentIds || []).includes(selectedStudent.id) || existingByCourse.has(c.id)
    );
    const targetCourses = enrolledCourses.length > 0 ? enrolledCourses : [];
    const drafts: EditableGradeDraft[] = targetCourses.map((course) => {
      const g = existingByCourse.get(course.id);
      return {
        id: g?.id,
        courseId: course.id,
        midtermScore: g?.midtermScore ?? 0,
        finalScore: g?.finalScore ?? 0,
        assignmentScore: g?.assignmentScore ?? 0,
        quizScore: g?.quizScore ?? 0,
      };
    });
    // Also include any grades whose course might not match enrolledCourses
    existingGrades.forEach((g) => {
      if (!drafts.some((d) => d.courseId === g.courseId)) {
        drafts.push({
          id: g.id,
          courseId: g.courseId,
          midtermScore: g.midtermScore,
          finalScore: g.finalScore,
          assignmentScore: g.assignmentScore,
          quizScore: g.quizScore,
        });
      }
    });
    setGradeDrafts(drafts);
    setCourseToAddId('');
  }, [selectedStudent, schoolId, registryMap, qualitativeMap, grades, courses]);

  const availableCoursesToAdd = useMemo(() => {
    const usedIds = new Set(gradeDrafts.map((d) => d.courseId));
    return courses.filter((c) => !usedIds.has(c.id));
  }, [courses, gradeDrafts]);

  const effectivePurpose =
    pp7Purpose === '__custom__'
      ? customPp7Purpose.trim() || PP7_PURPOSE_OPTIONS[0]
      : pp7Purpose;

  const activeDossier = useMemo(() => {
    if (!selectedStudent) return null;
    const signers = loadSchoolRegistrySigners(schoolId);
    const reg =
      registryDraft || getStudentRegistryRecord(registryMap, selectedStudent, signers);
    const qual =
      qualDraft || getStudentQualitativeRecord(qualitativeMap, selectedStudent.id);
    const mergedStudent = studentDraft || selectedStudent;

    // Preview uses live grade drafts if user modified scores in editor
    const mergedGrades = grades.map((g) => {
      if (g.studentId !== selectedStudent.id) return g;
      const draft = gradeDrafts.find((d) => d.courseId === g.courseId);
      if (!draft) return g;
      const totalScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            draft.midtermScore + draft.finalScore + draft.assignmentScore + draft.quizScore
          )
        )
      );
      const calc = calculateGrade(totalScore, systemConfig.gradingSystem);
      return {
        ...g,
        midtermScore: draft.midtermScore,
        finalScore: draft.finalScore,
        assignmentScore: draft.assignmentScore,
        quizScore: draft.quizScore,
        totalScore,
        letterGrade: calc.letter,
        gradePoint: calc.point,
      };
    });

    return buildStudentMoeDossier({
      student: mergedStudent,
      school,
      systemConfig,
      courses,
      grades: mergedGrades,
      attendance,
      periodAttendance,
      timetableSlots,
      behaviorRecords,
      sdqAssessments,
      infirmaryVisits,
      registry: reg,
      qualitative: qual,
      pp7Purpose: effectivePurpose,
    });
  }, [
    selectedStudent,
    schoolId,
    registryDraft,
    registryMap,
    qualDraft,
    qualitativeMap,
    studentDraft,
    grades,
    gradeDrafts,
    systemConfig,
    school,
    courses,
    attendance,
    periodAttendance,
    timetableSlots,
    behaviorRecords,
    sdqAssessments,
    infirmaryVisits,
    effectivePurpose,
  ]);

  const previewHtml = useMemo(() => {
    if (!activeDossier) return '';
    return buildMoeDocumentHtml(activeDocType, activeDossier);
  }, [activeDossier, activeDocType]);

  const handleAddCourseGradeRow = () => {
    if (!courseToAddId) return;
    if (gradeDrafts.some((d) => d.courseId === courseToAddId)) return;
    setGradeDrafts((prev) => [
      ...prev,
      {
        courseId: courseToAddId,
        midtermScore: 0,
        finalScore: 0,
        assignmentScore: 0,
        quizScore: 0,
      },
    ]);
    setCourseToAddId('');
  };

  const handleSaveSchoolDefaultSigners = () => {
    if (!registryDraft) return;
    saveSchoolRegistrySigners(schoolId, {
      affiliationOffice: registryDraft.affiliationOffice,
      registrarName: registryDraft.registrarName,
      academicHeadName: registryDraft.academicHeadName,
      principalName: registryDraft.principalName,
      updatedAt: new Date().toISOString(),
    });
    setStatusBanner({
      type: 'success',
      message: 'บันทึกชื่อผู้บริหาร นายทะเบียน และสังกัดเป็นค่าเริ่มต้นของโรงเรียนเรียบร้อยแล้ว',
    });
  };

  const handleSaveAllToStudentDatabase = async () => {
    if (!selectedStudent || !studentDraft || !registryDraft || !qualDraft) return;
    setIsSavingAll(true);
    setStatusBanner(null);
    try {
      // 1. Update grades first and compute updated student GPA
      let savedGradesCount = 0;
      gradeDrafts.forEach((draft) => {
        const totalScore = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              draft.midtermScore + draft.finalScore + draft.assignmentScore + draft.quizScore
            )
          )
        );
        const calc = calculateGrade(totalScore, systemConfig.gradingSystem);
        if (draft.id) {
          onUpdateGrade?.(draft.id, {
            midtermScore: draft.midtermScore,
            finalScore: draft.finalScore,
            assignmentScore: draft.assignmentScore,
            quizScore: draft.quizScore,
            totalScore,
            letterGrade: calc.letter,
            gradePoint: calc.point,
          });
          savedGradesCount += 1;
        } else if (
          onAddGrade &&
          draft.midtermScore + draft.finalScore + draft.assignmentScore + draft.quizScore > 0
        ) {
          onAddGrade(
            {
              id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              schoolId,
              studentId: selectedStudent.id,
              courseId: draft.courseId,
              academicYear,
              semester,
              midtermScore: draft.midtermScore,
              finalScore: draft.finalScore,
              assignmentScore: draft.assignmentScore,
              quizScore: draft.quizScore,
              totalScore,
              letterGrade: calc.letter,
              gradePoint: calc.point,
            },
            { notify: false }
          );
          savedGradesCount += 1;
        }
      });

      // 2. Merge registry fields into Student record & update Student DB state (triggers Supabase auto-sync)
      const mergedStudent = mergeRegistryFieldsIntoStudent(studentDraft, registryDraft);
      onUpdateStudent?.(mergedStudent);

      // 3. Persist Registry + Qualitative into localStorage + Supabase student_registry_records
      const syncResult = await saveStudentRegistryAndQualitativeToDb({
        schoolId,
        studentId: selectedStudent.id,
        academicYear,
        semester,
        registry: registryDraft,
        qualitative: qualDraft,
      });

      setRegistryMap(loadSchoolRegistryMap(schoolId));
      setQualitativeMap(loadQualitativeAssessments(schoolId, academicYear, semester));
      setStatusBanner({
        type: 'success',
        message: `บันทึกข้อมูลทะเบียน คะแนน (${savedGradesCount} วิชา) และผลประเมิน สพฐ. ของ ${mergedStudent.firstNameTh} ${mergedStudent.lastNameTh} ลงฐานข้อมูลเรียบร้อยแล้ว${
          syncResult.syncedToSupabase ? ' (ซิงก์ฐานข้อมูลกลางแล้ว)' : ''
        }`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้',
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleDownloadCurrentPdf = () => {
    if (!activeDossier) return;
    try {
      const { fileName } = downloadMoeDocumentPdf(activeDocType, activeDossier);
      setStatusBanner({
        type: 'success',
        message: `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'สร้างไฟล์ PDF ไม่สำเร็จ',
      });
    }
  };

  const handlePrintCurrentDoc = () => {
    if (!activeDossier) return;
    printMoeDocument(activeDocType, activeDossier);
  };

  const handlePrintBundle = () => {
    if (!activeDossier || bundleDocsSelected.length === 0) return;
    printMoeBundleDocuments(bundleDocsSelected, activeDossier);
    setShowBundleModal(false);
  };

  const handleExportCsv = () => {
    if (!activeDossier) return;
    const fileName = exportStudentMoeCsv(activeDossier);
    setStatusBanner({
      type: 'success',
      message: `ส่งออกไฟล์ Excel/CSV (${fileName}) เรียบร้อยแล้ว`,
    });
  };

  const handleExportJson = () => {
    if (!activeDossier) return;
    const fileName = exportStudentMoeJson(activeDossier);
    setStatusBanner({
      type: 'success',
      message: `ส่งออกข้อมูลฐานข้อมูลนักเรียน (${fileName}) เรียบร้อยแล้ว`,
    });
  };

  const qualSummary = useMemo(
    () => summarizeStudentQualitative(qualDraft || createDefaultStudentQualitative('')),
    [qualDraft]
  );

  const ratingChoices = [
    { value: 3, label: 'ดีเยี่ยม (3)' },
    { value: 2, label: 'ดี (2)' },
    { value: 1, label: 'ผ่าน (1)' },
    { value: 0, label: 'ไม่ผ่าน (0)' },
  ];

  const handleAutoHomeroomComment = () => {
    if (!selectedStudent || !qualDraft) return;
    const name = `${getStudentShortPrefixTh(selectedStudent)} ${selectedStudent.firstNameTh} ${selectedStudent.lastNameTh}`.trim();
    const gpaVal = activeDossier?.academicSummary.gpax ?? 0;
    const attPct = activeDossier?.dailyAttendanceStats.percentText || '100%';
    const comment = activeDossier?.academicSummary.hideGpaCalculations
      ? `${name} มีความตั้งใจเรียนดี มีผลประเมินเฉลี่ย ${activeDossier.academicSummary.averageRawScore ?? '-'}% และมีเวลาเรียนสม่ำเสมอ (${attPct}) ปฏิบัติตามระเบียบของสถานศึกษาได้ดี`
      : `${name} มีความรับผิดชอบในการเรียน ผลการเรียนเฉลี่ยสะสม (GPAX) ${gpaVal.toFixed(2)} และเวลาเรียน ${attPct} ร่วมกิจกรรมของโรงเรียนสม่ำเสมอ`;
    setQualDraft({ ...qualDraft, homeroomComment: comment });
  };

  if (students.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-center">
        <Database className="w-10 h-10 text-[var(--color-text-muted)] mb-2" />
        <p className="text-sm font-bold text-[var(--color-text-title)]">ยังไม่มีรายชื่อนักเรียนในระบบ</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          เพิ่มรายชื่อนักเรียนในเมนู "ทะเบียนนักเรียน" เพื่อเริ่มจัดทำเอกสาร สพฐ. รายบุคคล
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
      {/* Left Column: Searchable Student Roster Picker */}
      <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col min-h-0 max-h-64 lg:max-h-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden print:hidden">
        <div className="p-3 border-b border-[var(--color-border)] space-y-2 bg-[var(--color-card-subtle)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[var(--color-primary-text)]" />
              <span>เลือกชื่อนักเรียน ({filteredStudents.length})</span>
            </h2>
            <select
              aria-label="กรองตามห้องเรียน"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-title)] outline-none"
            >
              <option value="all">ทุกห้อง</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, เลข ปชช..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)] outline-none focus:border-[var(--color-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--color-border)]">
          {filteredStudents.map((stu) => {
            const isSelected = selectedStudent?.id === stu.id;
            const stuGradeCount = grades.filter((g) => g.studentId === stu.id).length;
            const hasSavedRegistry = Boolean(registryMap[stu.id]);
            return (
              <button
                key={stu.id}
                type="button"
                onClick={() => handleChooseStudent(stu.id)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary-light)] border-l-4 border-l-[var(--color-primary)]'
                    : 'hover:bg-[var(--color-card-subtle)]'
                }`}
              >
                <img
                  src={stu.avatarUrl}
                  alt={stu.firstNameTh}
                  className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--color-text-title)] truncate">
                    {getStudentShortPrefixTh(stu)} {stu.firstNameTh} {stu.lastNameTh}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate tabular-nums">
                    {stu.studentIdNumber} · {stu.room}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                    <span>{stuGradeCount} วิชา</span>
                    <span>·</span>
                    <span className={stu.nationalId ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                      {stu.nationalId ? 'มี ปชช. 13 หลัก' : 'ยังขาด ปชช.'}
                    </span>
                    {hasSavedRegistry && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--color-primary-text)] font-semibold">บันทึกแล้ว</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredStudents.length === 0 && (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
              ไม่พบรายชื่อนักเรียนที่ตรงกับคำค้นหา
            </div>
          )}
        </div>
      </aside>

      {/* Right Main Area: Unified Database Editor + OBEC/MOE Document Preview & Print */}
      {selectedStudent && activeDossier && (
        <div className="flex-1 min-w-0 flex flex-col min-h-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          {/* Student Header & Action Toolbar */}
          <div className="shrink-0 p-3.5 border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-3 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedStudent.avatarUrl}
                  alt={selectedStudent.firstNameTh}
                  className="w-11 h-11 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
                      {activeDossier.registry.prefixTh} {selectedStudent.firstNameTh} {selectedStudent.lastNameTh}
                    </h2>
                    <span className="text-xs font-mono font-bold text-[var(--color-primary-text)] tabular-nums">
                      {selectedStudent.studentIdNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate tabular-nums">
                    {selectedStudent.gradeLevel} · {selectedStudent.room} · เลข ปชช. {selectedStudent.nationalId || 'ยังไม่ระบุ'} ·{' '}
                    {activeDossier.academicSummary.hideGpaCalculations
                      ? `เฉลี่ย ${activeDossier.academicSummary.averageRawScore ?? '-'}%`
                      : `GPAX ${(activeDossier.academicSummary.gpax ?? 0).toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintCurrentDoc}
                  className="btn-action-primary px-3 py-1.5 whitespace-nowrap shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ A4 ({MOE_OFFICIAL_DOCUMENTS.find((d) => d.id === activeDocType)?.code})</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCurrentPdf}
                  className="btn-action-success px-3 py-1.5 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBundleModal(true)}
                  className="btn-tool-tone px-2.5 py-1.5 whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>พิมพ์ชุดรวม (ปพ.1–8)</span>
                </button>
                <details className="relative">
                  <summary className="btn-tool-neutral list-none px-2.5 py-1.5 whitespace-nowrap shrink-0 cursor-pointer">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>ส่งออกข้อมูล</span>
                  </summary>
                  <div className="absolute right-0 mt-1 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-1.5 z-30 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.closest('details')?.removeAttribute('open');
                        handleExportCsv();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ส่งออก Excel / CSV (ทั้งประวัติและเกรด)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.closest('details')?.removeAttribute('open');
                        handleExportJson();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-card-subtle)] flex items-center gap-2 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ส่งออก JSON ฐานข้อมูลเด็ก</span>
                    </button>
                  </div>
                </details>
              </div>
            </div>

            {/* Primary Mode Switcher + Document Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]">
              <div className="seg-tab-group">
                <button
                  type="button"
                  data-active={workspaceMode === 'docs'}
                  onClick={() => setWorkspaceMode('docs')}
                  className="seg-tab-btn flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ออกเอกสาร สพฐ. / ศธ. (ปพ.1–ปพ.8)</span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    data-active={workspaceMode === 'database'}
                    onClick={() => setWorkspaceMode('database')}
                    className="seg-tab-btn flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไข/บันทึกข้อมูล &amp; คะแนนลงฐานข้อมูลเด็ก</span>
                  </button>
                )}
              </div>

              {workspaceMode === 'database' && canEdit && (
                <button
                  type="button"
                  disabled={isSavingAll}
                  onClick={handleSaveAllToStudentDatabase}
                  className="btn-action-success px-3.5 py-1.5 whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingAll ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลงฐานข้อมูลเด็ก'}</span>
                </button>
              )}
            </div>

            {statusBanner && (
              <div
                role="status"
                className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 border ${
                  statusBanner.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {statusBanner.message}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusBanner(null)}
                  className="opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Body Content */}
          {workspaceMode === 'docs' ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* 6 MOE Document Tabs */}
              <div className="shrink-0 px-3.5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card)] flex flex-wrap items-center gap-1.5 overflow-x-auto print:hidden">
                {MOE_OFFICIAL_DOCUMENTS.map((doc) => {
                  const active = activeDocType === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setActiveDocType(doc.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)]'
                      }`}
                    >
                      {doc.code} · {doc.titleTh}
                    </button>
                  );
                })}
              </div>

              {/* Contextual Doc Controls (e.g. Pp.7 Purpose or Quick Missing Data Prompt) */}
              {activeDocType === 'pp7' && (
                <div className="shrink-0 px-4 py-2.5 border-b border-[var(--color-border)] bg-sky-50/70 dark:bg-sky-950/30 flex flex-wrap items-center gap-2 text-xs print:hidden">
                  <span className="font-bold text-sky-900 dark:text-sky-200 shrink-0">
                    วัตถุประสงค์การออกใบรับรอง (ปพ.7):
                  </span>
                  <select
                    value={pp7Purpose}
                    onChange={(e) => setPp7Purpose(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs text-[var(--color-text-title)]"
                  >
                    {PP7_PURPOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="__custom__">ระบุวัตถุประสงค์เอง...</option>
                  </select>
                  {pp7Purpose === '__custom__' && (
                    <input
                      type="text"
                      value={customPp7Purpose}
                      onChange={(e) => setCustomPp7Purpose(e.target.value)}
                      placeholder="พิมพ์วัตถุประสงค์..."
                      className="flex-1 min-w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs text-[var(--color-text-title)]"
                    />
                  )}
                </div>
              )}

              {/* A4 White Paper Preview Canvas */}
              <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100 dark:bg-slate-900/70 p-3 sm:p-5 print:p-0 print:bg-white">
                <div
                  className="mx-auto max-w-[820px] bg-white text-slate-900 border border-slate-300 shadow-md rounded-sm overflow-hidden print:shadow-none print:border-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          ) : (
            /* Database Editor Mode */
            studentDraft &&
            registryDraft &&
            qualDraft && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-xs">
                {/* Section 1: Registration & Family Info */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3">
                  <h3 className="text-sm font-bold text-[var(--color-text-title)] border-b border-[var(--color-border)] pb-2">
                    ๑. ข้อมูลทะเบียนราษฎร์และครอบครัว (บันทึกลงฐานข้อมูลนักเรียน)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">คำนำหน้าชื่อ</span>
                      <input
                        type="text"
                        value={registryDraft.prefixTh}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, prefixTh: e.target.value })
                        }
                        placeholder="ด.ช. / ด.ญ. / นาย / นางสาว"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ชื่อ (ภาษาไทย)</span>
                      <input
                        type="text"
                        value={studentDraft.firstNameTh}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, firstNameTh: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">นามสกุล (ภาษาไทย)</span>
                      <input
                        type="text"
                        value={studentDraft.lastNameTh}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, lastNameTh: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">เลขประจำตัวประชาชน 13 หลัก (DMC)</span>
                      <input
                        type="text"
                        value={studentDraft.nationalId || ''}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, nationalId: e.target.value })
                        }
                        placeholder="1-XXXX-XXXXX-XX-X"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">First Name (EN)</span>
                      <input
                        type="text"
                        value={studentDraft.firstNameEn}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, firstNameEn: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">Last Name (EN)</span>
                      <input
                        type="text"
                        value={studentDraft.lastNameEn}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, lastNameEn: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">วัน/เดือน/ปีเกิด</span>
                      <input
                        type="text"
                        value={studentDraft.dateOfBirth || ''}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, dateOfBirth: e.target.value })
                        }
                        placeholder="YYYY-MM-DD"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">สถานะนักเรียน</span>
                      <select
                        value={studentDraft.status || 'active'}
                        onChange={(e) =>
                          setStudentDraft({
                            ...studentDraft,
                            status: e.target.value as StudentStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-semibold"
                      >
                        {Object.values(STUDENT_STATUS_DETAILS).map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.labelTh}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ระดับชั้น</span>
                      <input
                        list="moe-hub-grade-levels"
                        value={studentDraft.gradeLevel}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, gradeLevel: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                      <datalist id="moe-hub-grade-levels">
                        {ALL_GRADE_LEVELS.map((g) => (
                          <option key={g.value} value={g.value} />
                        ))}
                      </datalist>
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ห้องเรียน</span>
                      <input
                        type="text"
                        value={studentDraft.room}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, room: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">สัญชาติ / ศาสนา</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={registryDraft.nationality}
                          onChange={(e) =>
                            setRegistryDraft({ ...registryDraft, nationality: e.target.value })
                          }
                          placeholder="สัญชาติ"
                          className="w-1/2 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                        />
                        <input
                          type="text"
                          value={registryDraft.religion}
                          onChange={(e) =>
                            setRegistryDraft({ ...registryDraft, religion: e.target.value })
                          }
                          placeholder="ศาสนา"
                          className="w-1/2 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                        />
                      </div>
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">หมู่เลือด</span>
                      <select
                        value={studentDraft.bloodType || ''}
                        onChange={(e) =>
                          setStudentDraft({
                            ...studentDraft,
                            bloodType: (e.target.value || undefined) as Student['bloodType'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      >
                        <option value="">ไม่ระบุ</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ชื่อ-สกุล บิดา</span>
                      <input
                        type="text"
                        value={registryDraft.fatherName}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, fatherName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ชื่อ-สกุล มารดา</span>
                      <input
                        type="text"
                        value={registryDraft.motherName}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, motherName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ผู้ปกครองหลัก</span>
                      <input
                        type="text"
                        value={studentDraft.guardianName}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, guardianName: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">เบอร์โทรผู้ปกครอง</span>
                      <input
                        type="text"
                        value={studentDraft.guardianPhone}
                        onChange={(e) =>
                          setStudentDraft({ ...studentDraft, guardianPhone: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono"
                      />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="font-semibold text-[var(--color-text-body)]">ที่อยู่ตามทะเบียนบ้าน / ปัจจุบัน</span>
                    <input
                      type="text"
                      value={studentDraft.address || ''}
                      onChange={(e) =>
                        setStudentDraft({ ...studentDraft, address: e.target.value })
                      }
                      placeholder="บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                    />
                  </label>
                </section>

                {/* Section 2: OBEC Registration Numbers & Signers */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                      ๒. เลขทะเบียนเอกสาร สพฐ. (ปพ.1 / ปพ.3 / ปพ.7) และผู้ลงนาม
                    </h3>
                    <button
                      type="button"
                      onClick={handleSaveSchoolDefaultSigners}
                      className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[11px] font-bold text-[var(--color-primary-text)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                    >
                      ใช้ชื่อผู้ลงนาม &amp; สังกัดนี้เป็นค่าเริ่มต้นทั้งโรงเรียน
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">เลขที่เอกสาร ปพ.1</span>
                      <input
                        type="text"
                        value={registryDraft.pp1DocNo}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, pp1DocNo: e.target.value })
                        }
                        placeholder="เช่น ปพ.1-2569/001"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ชุดที่ / เล่มที่ ปพ.3</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={registryDraft.pp3SetNo}
                          onChange={(e) =>
                            setRegistryDraft({ ...registryDraft, pp3SetNo: e.target.value })
                          }
                          placeholder="ชุดที่"
                          className="w-1/2 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono text-[var(--color-text-title)]"
                        />
                        <input
                          type="text"
                          value={registryDraft.pp3BookNo}
                          onChange={(e) =>
                            setRegistryDraft({ ...registryDraft, pp3BookNo: e.target.value })
                          }
                          placeholder="เล่ม/เลขที่"
                          className="w-1/2 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono text-[var(--color-text-title)]"
                        />
                      </div>
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">สถานะอนุมัติจบ ปพ.3</span>
                      <select
                        value={registryDraft.pp3ApprovalStatus}
                        onChange={(e) =>
                          setRegistryDraft({
                            ...registryDraft,
                            pp3ApprovalStatus: e.target.value as Pp3ApprovalStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-semibold text-[var(--color-text-title)]"
                      >
                        <option value="pending">รอตรวจสอบข้อมูล</option>
                        <option value="verified">ตรวจคุณสมบัติครบ · รอลงนาม</option>
                        <option value="approved">อนุมัติจบการศึกษาแล้ว</option>
                        <option value="not_eligible">ยังไม่ผ่านเกณฑ์จบ</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">เลขที่ใบรับรอง ปพ.7</span>
                      <input
                        type="text"
                        value={registryDraft.pp7DocNo}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, pp7DocNo: e.target.value })
                        }
                        placeholder="เช่น ศธ.2569/014"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] font-mono text-[var(--color-text-title)]"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">สังกัด / สพท.</span>
                      <input
                        type="text"
                        value={registryDraft.affiliationOffice}
                        onChange={(e) =>
                          setRegistryDraft({
                            ...registryDraft,
                            affiliationOffice: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ครูประจำชั้น / ที่ปรึกษา</span>
                      <input
                        type="text"
                        value={registryDraft.advisorName}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, advisorName: e.target.value })
                        }
                        placeholder="ชื่อ-สกุล ครูประจำชั้น"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">นายทะเบียน / หัวหน้าวัดผล</span>
                      <input
                        type="text"
                        value={registryDraft.registrarName}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, registrarName: e.target.value })
                        }
                        placeholder="ชื่อ-สกุล นายทะเบียน"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-semibold text-[var(--color-text-body)]">ผู้อำนวยการสถานศึกษา</span>
                      <input
                        type="text"
                        value={registryDraft.principalName}
                        onChange={(e) =>
                          setRegistryDraft({ ...registryDraft, principalName: e.target.value })
                        }
                        placeholder="ชื่อ-สกุล ผู้อำนวยการ"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      />
                    </label>
                  </div>
                </section>

                {/* Section 3: Subject Scores Entry for This Student */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                      ๓. คะแนนและผลการเรียนรายวิชา ({gradeDrafts.length} วิชา)
                    </h3>
                    {availableCoursesToAdd.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={courseToAddId}
                          onChange={(e) => setCourseToAddId(e.target.value)}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs text-[var(--color-text-title)]"
                        >
                          <option value="">+ เพิ่มรายวิชาให้เด็กคนนี้...</option>
                          {availableCoursesToAdd.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} · {c.titleTh}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!courseToAddId}
                          onClick={handleAddCourseGradeRow}
                          className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)] disabled:opacity-40 text-white font-bold cursor-pointer"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-title)] font-bold">
                        <tr>
                          <th className="py-2 px-3">รายวิชา</th>
                          <th className="py-2 px-2 text-center w-20">งาน/เก็บ</th>
                          <th className="py-2 px-2 text-center w-20">สอบย่อย</th>
                          <th className="py-2 px-2 text-center w-20">กลางภาค</th>
                          <th className="py-2 px-2 text-center w-20">ปลายภาค</th>
                          <th className="py-2 px-2 text-center w-20">รวม (100)</th>
                          <th className="py-2 px-2 text-center w-20">เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {gradeDrafts.map((draft, idx) => {
                          const crs = courses.find((c) => c.id === draft.courseId);
                          const total = Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round(
                                draft.midtermScore +
                                  draft.finalScore +
                                  draft.assignmentScore +
                                  draft.quizScore
                              )
                            )
                          );
                          const calc = calculateGrade(total, systemConfig.gradingSystem);
                          return (
                            <tr key={draft.courseId}>
                              <td className="py-2 px-3">
                                <div className="font-bold text-[var(--color-text-title)]">
                                  {crs?.code || draft.courseId} · {crs?.titleTh || 'รายวิชา'}
                                </div>
                                <div className="text-[10px] text-[var(--color-text-muted)]">
                                  {crs?.credits ?? 1} หน่วยกิต
                                </div>
                              </td>
                              {(['assignmentScore', 'quizScore', 'midtermScore', 'finalScore'] as const).map(
                                (field) => (
                                  <td key={field} className="py-1.5 px-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={draft[field]}
                                      onChange={(e) => {
                                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                        setGradeDrafts((prev) =>
                                          prev.map((row, rIdx) =>
                                            rIdx === idx ? { ...row, [field]: val } : row
                                          )
                                        );
                                      }}
                                      className="w-16 text-center px-1.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono font-bold text-[var(--color-text-title)] tabular-nums"
                                    />
                                  </td>
                                )
                              )}
                              <td className="py-2 px-2 text-center font-mono font-extrabold text-[var(--color-text-title)] tabular-nums">
                                {total}
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                {calc.letter}
                              </td>
                            </tr>
                          );
                        })}
                        {gradeDrafts.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-[var(--color-text-muted)]">
                              ยังไม่มีรายวิชาที่ผูกคะแนน สามารถเลือก "+ เพิ่มรายวิชา" ด้านบนได้ทันที
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Section 4: Qualitative MOE Assessment */}
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                      ๔. ประเมินคุณลักษณะฯ 8 ข้อ, อ่านคิดวิเคราะห์เขียน 5 ด้าน, สมรรถนะ 5 ด้าน &amp; กิจกรรม
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      สรุป: คุณลักษณะ {qualSummary.attrLabel} · อ่านฯ {qualSummary.readingLabel} · สมรรถนะ {qualSummary.compLabel} · กิจกรรม {qualSummary.activityResult}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                      <div className="font-bold text-[var(--color-text-title)] mb-1">
                        คุณลักษณะอันพึงประสงค์ 8 ประการ
                      </div>
                      {MOE_DESIRABLE_ATTRIBUTES_RUBRIC.map((item, idx) => (
                        <div key={item.index} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="truncate">{item.titleTh}</span>
                          <select
                            value={qualDraft.attributes[idx] ?? 3}
                            onChange={(e) => {
                              const next = [...qualDraft.attributes];
                              next[idx] = Number(e.target.value);
                              setQualDraft({ ...qualDraft, attributes: next });
                            }}
                            className="rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-0.5 text-[11px] font-bold"
                          >
                            {ratingChoices.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                        <div className="font-bold text-[var(--color-text-title)] mb-1">
                          การอ่าน คิดวิเคราะห์ และเขียน (5 ด้าน)
                        </div>
                        {MOE_READING_WRITING_RUBRIC.map((item, idx) => (
                          <div key={item.index} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="truncate">{item.titleTh}</span>
                            <select
                              value={qualDraft.readingWriting[idx] ?? 3}
                              onChange={(e) => {
                                const next = [...qualDraft.readingWriting];
                                next[idx] = Number(e.target.value);
                                setQualDraft({ ...qualDraft, readingWriting: next });
                              }}
                              className="rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-0.5 text-[11px] font-bold"
                            >
                              {ratingChoices.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                        <div className="font-bold text-[var(--color-text-title)] mb-1">
                          สมรรถนะสำคัญ 5 ด้าน &amp; กิจกรรมพัฒนาผู้เรียน
                        </div>
                        {MOE_KEY_COMPETENCIES.map((titleTh, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="truncate">{titleTh}</span>
                            <select
                              value={qualDraft.competencies[idx] ?? 3}
                              onChange={(e) => {
                                const next = [...qualDraft.competencies];
                                next[idx] = Number(e.target.value);
                                setQualDraft({ ...qualDraft, competencies: next });
                              }}
                              className="rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-0.5 text-[11px] font-bold"
                            >
                              {ratingChoices.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
                          {MOE_STUDENT_ACTIVITIES.map((act, idx) => (
                            <div key={act.name} className="flex items-center justify-between gap-2">
                              <span className="truncate">{act.name}</span>
                              <select
                                value={qualDraft.activities[idx] || 'ผ (ผ่าน)'}
                                onChange={(e) => {
                                  const next = [...qualDraft.activities] as Array<'ผ (ผ่าน)' | 'มผ (ไม่ผ่าน)'>;
                                  next[idx] = e.target.value as 'ผ (ผ่าน)' | 'มผ (ไม่ผ่าน)';
                                  setQualDraft({ ...qualDraft, activities: next });
                                }}
                                className="rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2 py-0.5 text-[11px] font-bold"
                              >
                                <option value="ผ (ผ่าน)">ผ (ผ่าน)</option>
                                <option value="มผ (ไม่ผ่าน)">มผ (ไม่ผ่าน)</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--color-text-title)]">ความเห็นและข้อเสนอแนะครูประจำชั้น</span>
                      <button
                        type="button"
                        onClick={handleAutoHomeroomComment}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold text-[11px] cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>สร้างความเห็นจากผลการเรียนอัตโนมัติ</span>
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={qualDraft.homeroomComment || ''}
                      onChange={(e) =>
                        setQualDraft({ ...qualDraft, homeroomComment: e.target.value })
                      }
                      placeholder="ความเห็นครูประจำชั้นที่จะไปแสดงใน ปพ.1, ปพ.6 และ ปพ.8"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                    />
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    ข้อมูลทั้งหมดจะถูกบันทึกลงฐานข้อมูลนักเรียนและอัปเดตเอกสาร ปพ.1–ปพ.8 ทันที · ผู้แก้ไข: {currentUser?.fullNameTh || currentRole}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('docs')}
                      className="btn-tool-neutral px-3 py-2"
                    >
                      ดูพรีวิวเอกสาร สพฐ.
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAll}
                      onClick={handleSaveAllToStudentDatabase}
                      className="btn-action-success px-5 py-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingAll ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลงฐานข้อมูลเด็ก'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Bundle Print Selector Modal */}
      {showBundleModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-title)]">
                  พิมพ์ชุดเอกสาร สพฐ. รวม ({selectedStudent.firstNameTh} {selectedStudent.lastNameTh})
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  เลือกเอกสารที่ต้องการพิมพ์ต่อกันเป็นชุด A4 ในครั้งเดียว
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBundleModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {MOE_OFFICIAL_DOCUMENTS.map((doc) => {
                const checked = bundleDocsSelected.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] cursor-pointer hover:bg-[var(--color-primary-light)]/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setBundleDocsSelected((prev) =>
                          checked ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                        )
                      }
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[var(--color-text-title)]">
                        {doc.code} · {doc.titleTh}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{doc.subtitleTh}</div>
                    </div>
                    {checked && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setShowBundleModal(false)}
                className="btn-tool-neutral px-3 py-1.5"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={bundleDocsSelected.length === 0}
                onClick={handlePrintBundle}
                className="btn-action-primary px-4 py-1.5 disabled:opacity-40"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>สั่งพิมพ์ {bundleDocsSelected.length} เอกสาร (A4)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
