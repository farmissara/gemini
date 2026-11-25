import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Search,
  Sliders,
} from 'lucide-react';
import type {
  AppLanguage,
  Course,
  GradeRecord,
  GradingSystem,
  School,
  Student,
  SystemConfig,
  UserRole,
} from '../../types';
import { calculateGrade } from '../../lib/schoolSettings';
import { calculateStudentAcademicSummary } from '../../lib/moeGrading';
import { loadQualitativeAssessments, summarizeStudentQualitative } from '../../lib/moeQualitativeStore';
import { LearningIndicatorAssessmentPanel } from '../../components/LearningIndicatorAssessmentPanel';
import { PagedList } from '../../components/PagedList';

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
  { id: '60_40', label: 'มาตรฐาน 60:40', weights: { midterm: 30, final: 40, assignment: 20, quiz: 10 } },
  { id: '70_30', label: 'สพฐ. 70:30', weights: { midterm: 25, final: 30, assignment: 30, quiz: 15 } },
  { id: '80_20', label: 'เน้นปฏิบัติ 80:20', weights: { midterm: 20, final: 20, assignment: 45, quiz: 15 } },
  { id: '50_50', label: 'เน้นสอบ 50:50', weights: { midterm: 25, final: 50, assignment: 15, quiz: 10 } },
];

interface MobileTeacherGradebookTabProps {
  activeSchool: School;
  lang: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  systemConfig?: SystemConfig;
  courses: Course[];
  students: Student[];
  grades: GradeRecord[];
  gradingSystem: GradingSystem;
  canEditGradesMobile: boolean;
  onUpdateGrade?: (gradeId: string, updates: Partial<GradeRecord>) => void;
  onAddGrade?: (grade: GradeRecord, options?: { notify?: boolean }) => void;
  onBackHome: () => void;
}

export const MobileTeacherGradebookTab: React.FC<MobileTeacherGradebookTabProps> = ({
  activeSchool,
  lang,
  currentRole = 'teacher',
  currentUserName,
  systemConfig,
  courses,
  students,
  grades,
  gradingSystem,
  canEditGradesMobile,
  onUpdateGrade,
  onAddGrade,
  onBackHome,
}) => {
  const [mobileGradeCourseId, setMobileGradeCourseId] = useState<string>(courses[0]?.id || '');
  const [mobileGradeSearch, setMobileGradeSearch] = useState('');
  const [mobileGradeRoom, setMobileGradeRoom] = useState('all');
  const [mobileGradeToast, setMobileGradeToast] = useState<string | null>(null);
  const [gradebookSection, setGradebookSection] = useState<'scores' | 'indicators'>('scores');
  const [showWeightPanel, setShowWeightPanel] = useState(false);

  const weightStorageKey = `eduverse_obec_weights_v1_${activeSchool.id || 'default'}`;
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
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(weightStorageKey) : null;
      setCourseWeightsMap(raw ? (JSON.parse(raw) as Record<string, CourseScoreWeights>) : {});
    } catch {
      setCourseWeightsMap({});
    }
  }, [weightStorageKey]);

  useEffect(() => {
    if (!mobileGradeCourseId && courses.length > 0) {
      setMobileGradeCourseId(courses[0].id);
    }
  }, [courses, mobileGradeCourseId]);

  const selectedCourse = courses.find((c) => c.id === mobileGradeCourseId) || courses[0];
  const courseWeights: CourseScoreWeights =
    (selectedCourse && courseWeightsMap[selectedCourse.id]) || DEFAULT_SCORE_WEIGHTS;
  const weightSum =
    courseWeights.midterm + courseWeights.final + courseWeights.assignment + courseWeights.quiz;

  const saveCourseWeights = (courseId: string, nextWeights: CourseScoreWeights) => {
    const nextMap = {
      ...courseWeightsMap,
      [courseId]: nextWeights,
    };
    setCourseWeightsMap(nextMap);
    try {
      window.localStorage.setItem(weightStorageKey, JSON.stringify(nextMap));
    } catch {
      // ignore storage failure
    }
  };

  const resolvedSystemConfig = useMemo<SystemConfig>(
    () =>
      systemConfig || {
        schoolNameTh: activeSchool.nameTh,
        schoolNameEn: activeSchool.nameEn,
        academicYear: activeSchool.academicYear || '2569',
        currentSemester: activeSchool.currentSemester || '1',
        semesterOptions: ['1', '2', '3'],
        gradingSystem,
        staffPositionOptions: [],
        lineOaAddFriendUrl: '',
        lineChannelId: '',
        lineMessagingConfigured: false,
        resendApiKeyConfigured: false,
        resendFromEmail: '',
        supabaseConnected: false,
        thaiPdfFontEnabled: true,
        backupBucket: '',
        lastBackupDate: '',
      },
    [systemConfig, activeSchool, gradingSystem]
  );

  const updateStudentCourseScore = (
    course: Course,
    student: Student,
    existingGrade: GradeRecord | undefined,
    field: 'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore',
    rawValue: number
  ) => {
    if (!canEditGradesMobile) return;
    const maxMap = {
      midtermScore: courseWeights.midterm,
      finalScore: courseWeights.final,
      assignmentScore: courseWeights.assignment,
      quizScore: courseWeights.quiz,
    } as const;
    const clamped = Math.max(0, Math.min(maxMap[field], Number.isFinite(rawValue) ? Math.round(rawValue) : 0));
    const nextMidterm = field === 'midtermScore' ? clamped : existingGrade?.midtermScore ?? 0;
    const nextFinal = field === 'finalScore' ? clamped : existingGrade?.finalScore ?? 0;
    const nextAssignment = field === 'assignmentScore' ? clamped : existingGrade?.assignmentScore ?? 0;
    const nextQuiz = field === 'quizScore' ? clamped : existingGrade?.quizScore ?? 0;
    const totalScore = Math.min(100, nextMidterm + nextFinal + nextAssignment + nextQuiz);
    const graded = calculateGrade(totalScore, gradingSystem);

    if (existingGrade && onUpdateGrade) {
      onUpdateGrade(existingGrade.id, {
        [field]: clamped,
        totalScore,
        letterGrade: graded.letter,
        gradePoint: graded.point,
      });
    } else if (onAddGrade) {
      onAddGrade({
        id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        schoolId: activeSchool.id,
        studentId: student.id,
        courseId: course.id,
        academicYear: activeSchool.academicYear || '2569',
        semester: activeSchool.currentSemester || '1',
        midtermScore: nextMidterm,
        finalScore: nextFinal,
        assignmentScore: nextAssignment,
        quizScore: nextQuiz,
        totalScore,
        letterGrade: graded.letter,
        gradePoint: graded.point,
      });
    }
    setMobileGradeToast(
      lang === 'th'
        ? `บันทึก ${student.firstNameTh} · รวม ${totalScore} (${graded.letter})`
        : `Saved ${student.firstNameEn} · ${totalScore} (${graded.letter})`
    );
    window.setTimeout(() => setMobileGradeToast(null), 2200);
  };

  const enrolledSet = useMemo(
    () => new Set(selectedCourse?.enrolledStudentIds || []),
    [selectedCourse]
  );
  const baseStudents = useMemo(
    () => (enrolledSet.size > 0 ? students.filter((s) => enrolledSet.has(s.id)) : students),
    [enrolledSet, students]
  );
  const filteredStudents = useMemo(
    () =>
      baseStudents.filter((s) => {
        const roomLabel = `${s.gradeLevel} ${s.room}`.trim();
        if (mobileGradeRoom !== 'all' && roomLabel !== mobileGradeRoom) return false;
        if (mobileGradeSearch.trim()) {
          const q = mobileGradeSearch.toLowerCase();
          const hay = `${s.firstNameTh} ${s.lastNameTh} ${s.studentIdNumber} ${s.room}`.toLowerCase();
          return hay.includes(q);
        }
        return true;
      }),
    [baseStudents, mobileGradeRoom, mobileGradeSearch]
  );

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <h2 className="text-sm font-bold text-[var(--color-text-title)]">
          {lang === 'th' ? 'สมุดบันทึกคะแนน ปพ.5' : 'Gradebook (PP.5)'}
        </h2>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
        <button
          type="button"
          onClick={() => setGradebookSection('scores')}
          className={`min-h-[40px] px-3 rounded-xl text-xs font-bold whitespace-nowrap truncate transition cursor-pointer ${
            gradebookSection === 'scores'
              ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          {lang === 'th' ? 'กรอกคะแนนรายช่อง' : 'Component Scores'}
        </button>
        <button
          type="button"
          onClick={() => setGradebookSection('indicators')}
          className={`min-h-[40px] px-3 rounded-xl text-xs font-bold whitespace-nowrap truncate transition cursor-pointer ${
            gradebookSection === 'indicators'
              ? 'bg-[var(--color-card)] text-[var(--color-primary-text)] shadow-xs'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          {lang === 'th' ? 'ตัวชี้วัด & ปพ.5' : 'Indicators & PP.5'}
        </button>
      </div>

      {!canEditGradesMobile && (
        <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
          {lang === 'th'
            ? 'สิทธิ์การแก้ไขคะแนนถูกจำกัดโดยผู้บริหารโรงเรียน (แสดงผลแบบอ่านอย่างเดียว)'
            : 'Grade editing is restricted by school policy (read-only mode).'}
        </div>
      )}

      {mobileGradeToast && (
        <div
          role="status"
          className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{mobileGradeToast}</span>
        </div>
      )}

      <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
            {lang === 'th' ? 'เลือกรายวิชา' : 'Select Course'}
          </label>
          <select
            value={mobileGradeCourseId}
            onChange={(e) => setMobileGradeCourseId(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)] focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {lang === 'th' ? c.titleTh : c.titleEn}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={mobileGradeSearch}
              onChange={(e) => setMobileGradeSearch(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อ / รหัสนักเรียน' : 'Search student...'}
              className="w-full min-h-[44px] pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] focus:outline-hidden"
            />
          </div>
          <select
            value={mobileGradeRoom}
            onChange={(e) => setMobileGradeRoom(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] focus:outline-hidden"
          >
            <option value="all">{lang === 'th' ? 'ทุกห้องเรียน' : 'All Rooms'}</option>
            {[...new Set(students.map((s) => `${s.gradeLevel} ${s.room}`.trim()).filter(Boolean))].map(
              (roomLabel) => (
                <option key={roomLabel} value={roomLabel}>
                  {roomLabel}
                </option>
              )
            )}
          </select>
        </div>

        {/* Weight Config Toggle for Component Scores */}
        {gradebookSection === 'scores' && selectedCourse && (
          <div className="pt-1 border-t border-[var(--color-border)] space-y-2.5">
            <button
              type="button"
              onClick={() => setShowWeightPanel((v) => !v)}
              className="w-full min-h-[38px] flex items-center justify-between gap-2 text-xs font-semibold text-[var(--color-primary-text)] cursor-pointer"
            >
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate tabular-nums">
                  {lang === 'th'
                    ? `สัดส่วนคะแนน (${courseWeights.midterm}/${courseWeights.final}/${courseWeights.assignment}/${courseWeights.quiz})`
                    : `Score Weights (${courseWeights.midterm}/${courseWeights.final}/${courseWeights.assignment}/${courseWeights.quiz})`}
                </span>
              </span>
              {showWeightPanel ? (
                <ChevronUp className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" />
              )}
            </button>

            {showWeightPanel && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-2 gap-1.5">
                  {OBEC_WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!canEditGradesMobile}
                      onClick={() => saveCourseWeights(selectedCourse.id, preset.weights)}
                      className="min-h-[38px] px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)] text-[11px] font-semibold text-[var(--color-text-title)] text-left truncate disabled:opacity-60 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { key: 'midterm', label: 'กลางภาค' },
                      { key: 'final', label: 'ปลายภาค' },
                      { key: 'assignment', label: 'ชิ้นงาน' },
                      { key: 'quiz', label: 'ทดสอบ' },
                    ] as const
                  ).map((item) => (
                    <label
                      key={item.key}
                      className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-center block"
                    >
                      <span className="block text-[10px] text-[var(--color-text-muted)]">{item.label}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!canEditGradesMobile}
                        value={courseWeights[item.key]}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
                          saveCourseWeights(selectedCourse.id, {
                            ...courseWeights,
                            [item.key]: v,
                          });
                        }}
                        className="w-full min-h-[32px] text-center text-xs font-mono font-bold tabular-nums text-[var(--color-text-title)] bg-transparent focus:outline-hidden"
                      />
                    </label>
                  ))}
                </div>
                <p
                  className={`text-[11px] tabular-nums font-medium ${
                    weightSum === 100
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {lang === 'th'
                    ? `ผลรวมคะแนนเต็ม: ${weightSum}/100 ${weightSum !== 100 ? '(แนะนำให้ปรับรวมเท่ากับ 100)' : ''}`
                    : `Total weight: ${weightSum}/100`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {!selectedCourse ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          {lang === 'th' ? 'ยังไม่มีรายวิชาในโรงเรียน' : 'No courses available'}
        </div>
      ) : gradebookSection === 'indicators' ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 overflow-x-auto">
          <LearningIndicatorAssessmentPanel
            course={selectedCourse}
            students={filteredStudents.length > 0 ? filteredStudents : baseStudents}
            school={activeSchool}
            systemConfig={resolvedSystemConfig}
            currentRole={currentRole}
            currentUserName={currentUserName}
            grades={grades}
            gradingSystem={gradingSystem}
            onUpdateGrade={onUpdateGrade}
            onAddGrade={onAddGrade}
          />
        </div>
      ) : (
        <PagedList
          items={filteredStudents}
          pageSize={5}
          previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
          nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
          paginationLabel={lang === 'th' ? 'หน้าคะแนนนักเรียน' : 'Gradebook pages'}
          emptyState={
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              {lang === 'th' ? 'ไม่พบนักเรียนที่ตรงกับตัวกรอง' : 'No matching students'}
            </div>
          }
          renderItem={(stu) => {
            const grade = grades.find((g) => g.courseId === selectedCourse.id && g.studentId === stu.id);
            const midterm = grade?.midtermScore ?? 0;
            const finalScore = grade?.finalScore ?? 0;
            const assignment = grade?.assignmentScore ?? 0;
            const quiz = grade?.quizScore ?? 0;
            const total = grade?.totalScore ?? 0;
            const letter = grade?.letterGrade ?? '-';
            return (
              <div
                key={stu.id}
                className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                      {stu.firstNameTh} {stu.lastNameTh}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                      {stu.studentIdNumber} · {stu.gradeLevel} {stu.room}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="text-base font-extrabold font-mono text-[var(--color-primary-text)]">
                      {total}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-text-muted)] ml-1.5">
                      ({letter})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      {
                        field: 'midtermScore',
                        label: `กลาง/${courseWeights.midterm}`,
                        max: courseWeights.midterm,
                        value: midterm,
                      },
                      {
                        field: 'finalScore',
                        label: `ปลาย/${courseWeights.final}`,
                        max: courseWeights.final,
                        value: finalScore,
                      },
                      {
                        field: 'assignmentScore',
                        label: `งาน/${courseWeights.assignment}`,
                        max: courseWeights.assignment,
                        value: assignment,
                      },
                      {
                        field: 'quizScore',
                        label: `สอบ/${courseWeights.quiz}`,
                        max: courseWeights.quiz,
                        value: quiz,
                      },
                    ] as const
                  ).map((cell) => (
                    <label
                      key={cell.field}
                      className="p-1.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-center block"
                    >
                      <span className="block text-[10px] text-[var(--color-text-muted)] font-medium">
                        {cell.label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={cell.max}
                        disabled={!canEditGradesMobile}
                        value={cell.value}
                        onChange={(e) =>
                          updateStudentCourseScore(
                            selectedCourse,
                            stu,
                            grade,
                            cell.field,
                            Number(e.target.value)
                          )
                        }
                        className="w-full min-h-[36px] text-center text-sm font-mono font-bold tabular-nums text-[var(--color-text-title)] bg-transparent disabled:opacity-60 focus:outline-hidden"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
};

interface MobileStudentGradesTabProps {
  activeSchool: School;
  ownStudent: Student | undefined;
  scopedCourses: Course[];
  grades: GradeRecord[];
  gradingSystem: GradingSystem;
  lang: AppLanguage;
  onBackHome: () => void;
}

export const MobileStudentGradesTab: React.FC<MobileStudentGradesTabProps> = ({
  activeSchool,
  ownStudent,
  scopedCourses,
  grades,
  gradingSystem,
  lang,
  onBackHome,
}) => {
  const [expandedGradeId, setExpandedGradeId] = useState<string | null>(null);
  const myGrades = ownStudent ? grades.filter((g) => g.studentId === ownStudent.id) : [];
  const summary = ownStudent
    ? calculateStudentAcademicSummary({
        student: ownStudent,
        courses: scopedCourses,
        grades: myGrades,
        gradingSystem,
      })
    : null;
  const gpaxVal: number =
    summary?.gpax != null && summary.gpax > 0 ? summary.gpax : ownStudent?.gpa ?? 0;

  const qualSummary = useMemo(() => {
    if (!ownStudent) return null;
    const records = loadQualitativeAssessments(
      activeSchool.id,
      activeSchool.academicYear || '2569',
      activeSchool.currentSemester || '1'
    );
    const rec = records[ownStudent.id];
    if (!rec) return null;
    return {
      record: rec,
      summary: summarizeStudentQualitative(rec),
    };
  }, [ownStudent, activeSchool.id, activeSchool.academicYear, activeSchool.currentSemester]);

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">
          {lang === 'th'
            ? `ปีการศึกษา ${activeSchool.academicYear || '2569'} · เทอม ${activeSchool.currentSemester || '1'}`
            : `AY ${activeSchool.academicYear || '2569'} · S${activeSchool.currentSemester || '1'}`}
        </span>
      </div>

      {/* Real GPAX Summary Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 shadow-md flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-sky-200">
            {lang === 'th' ? 'ผลการเรียนเฉลี่ยสะสม (GPAX)' : 'Cumulative GPAX'}
          </p>
          <div className="text-3xl font-extrabold tracking-tight tabular-nums">
            {gpaxVal > 0 ? gpaxVal.toFixed(2) : '—'}
          </div>
          <p className="text-xs text-slate-300 truncate tabular-nums">
            {ownStudent
              ? `${ownStudent.gradeLevel} ${ownStudent.room} · ${myGrades.length} รายวิชาที่มีผลคะแนน`
              : `${myGrades.length} รายวิชา`}
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
          <GraduationCap className="w-7 h-7 text-amber-300" />
        </div>
      </div>

      {/* Course-by-course grades (expandable component scores) */}
      {myGrades.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center space-y-2">
          <GraduationCap className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
          <p className="text-sm font-bold text-[var(--color-text-title)]">
            {lang === 'th' ? 'ยังไม่มีข้อมูลผลการเรียนในภาคเรียนนี้' : 'No grade records yet'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {lang === 'th'
              ? 'เมื่อคุณครูบันทึกคะแนนรายวิชาแล้ว ระบบจะแสดงผลการเรียนที่นี่อัตโนมัติ'
              : 'Grades will appear here automatically once recorded by your teachers.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)] overflow-hidden">
          {myGrades.map((g) => {
            const course = scopedCourses.find((c) => c.id === g.courseId);
            const gradeDisplay = g.letterGrade || calculateGrade(g.totalScore, gradingSystem).letter;
            const isExpanded = expandedGradeId === g.id;
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => setExpandedGradeId(isExpanded ? null : g.id)}
                  className="w-full min-h-[60px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                      {course?.titleTh || course?.titleEn || g.courseId}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] tabular-nums truncate">
                      {course?.code || 'รายวิชา'}
                      {course?.credits ? ` · ${course.credits} หน่วยกิต` : ''} · คะแนนรวม {g.totalScore}/100
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-extrabold text-[var(--color-primary-text)] tabular-nums">
                      {gradeDisplay}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-1 bg-[var(--color-card-subtle)] space-y-2 border-t border-[var(--color-border)]">
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                        <p className="text-[10px] text-[var(--color-text-muted)]">กลางภาค</p>
                        <p className="text-xs font-bold tabular-nums text-[var(--color-text-title)]">
                          {g.midtermScore ?? 0}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                        <p className="text-[10px] text-[var(--color-text-muted)]">ปลายภาค</p>
                        <p className="text-xs font-bold tabular-nums text-[var(--color-text-title)]">
                          {g.finalScore ?? 0}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                        <p className="text-[10px] text-[var(--color-text-muted)]">ชิ้นงาน</p>
                        <p className="text-xs font-bold tabular-nums text-[var(--color-text-title)]">
                          {g.assignmentScore ?? 0}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
                        <p className="text-[10px] text-[var(--color-text-muted)]">ทดสอบย่อย</p>
                        <p className="text-xs font-bold tabular-nums text-[var(--color-text-title)]">
                          {g.quizScore ?? 0}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums flex items-center justify-between">
                      <span>{lang === 'th' ? 'ระดับคะแนน (Grade Point)' : 'Grade Point'}</span>
                      <span className="font-bold text-[var(--color-text-title)]">
                        {typeof g.gradePoint === 'number' ? g.gradePoint.toFixed(2) : '—'}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Qualitative Assessment Summary (คุณลักษณะ / อ่านคิดวิเคราะห์ / สมรรถนะ / กิจกรรม) */}
      {qualSummary ? (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-[var(--color-text-title)]">
            {lang === 'th' ? 'ผลประเมินคุณลักษณะและกิจกรรม ปพ.5/6' : 'Qualitative Assessment'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">คุณลักษณะอันพึงประสงค์</p>
              <p className="text-xs font-bold text-[var(--color-text-title)] mt-0.5">
                {qualSummary.summary.attrLabel}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">อ่าน คิดวิเคราะห์ เขียน</p>
              <p className="text-xs font-bold text-[var(--color-text-title)] mt-0.5">
                {qualSummary.summary.readingLabel}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">สมรรถนะสำคัญผู้เรียน</p>
              <p className="text-xs font-bold text-[var(--color-text-title)] mt-0.5">
                {qualSummary.summary.compLabel}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">กิจกรรมพัฒนาผู้เรียน</p>
              <p className="text-xs font-bold text-[var(--color-text-title)] mt-0.5">
                {qualSummary.summary.activityResult}
              </p>
            </div>
          </div>
          {qualSummary.record.homeroomComment && (
            <p className="text-xs text-[var(--color-text-body)] pt-1 border-t border-[var(--color-border)]">
              ความเห็นครูที่ปรึกษา: {qualSummary.record.homeroomComment}
            </p>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
          {lang === 'th'
            ? 'ผลประเมินคุณลักษณะอันพึงประสงค์ อ่านคิดวิเคราะห์ และกิจกรรม ยังไม่ได้ประกาศในภาคเรียนนี้'
            : 'Qualitative assessment results have not been published yet.'}
        </div>
      )}
    </div>
  );
};
