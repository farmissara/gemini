import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, GraduationCap, Search } from 'lucide-react';
import type {
  AppLanguage,
  Course,
  GradeRecord,
  GradingSystem,
  School,
  Student,
} from '../../types';
import { calculateGrade } from '../../lib/schoolSettings';
import { calculateStudentAcademicSummary } from '../../lib/moeGrading';
import { PagedList } from '../../components/PagedList';

interface MobileTeacherGradebookTabProps {
  activeSchool: School;
  lang: AppLanguage;
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

  useEffect(() => {
    if (!mobileGradeCourseId && courses.length > 0) {
      setMobileGradeCourseId(courses[0].id);
    }
  }, [courses, mobileGradeCourseId]);

  const selectedCourse = courses.find((c) => c.id === mobileGradeCourseId) || courses[0];

  const updateStudentCourseScore = (
    course: Course,
    student: Student,
    existingGrade: GradeRecord | undefined,
    field: 'midtermScore' | 'finalScore' | 'assignmentScore' | 'quizScore',
    rawValue: number
  ) => {
    if (!canEditGradesMobile) return;
    const maxMap = { midtermScore: 30, finalScore: 40, assignmentScore: 20, quizScore: 10 } as const;
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
        academicYear: activeSchool.academicYear || '2568',
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

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <h2 className="text-sm font-bold text-[var(--color-text-title)]">
          {lang === 'th' ? 'กรอกคะแนน ปพ.5 ด่วน' : 'Quick Gradebook'}
        </h2>
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
      </div>

      {!selectedCourse ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          {lang === 'th' ? 'ยังไม่มีรายวิชาในโรงเรียน' : 'No courses available'}
        </div>
      ) : (
        (() => {
          const enrolledSet = new Set(selectedCourse.enrolledStudentIds || []);
          const baseStudents =
            enrolledSet.size > 0 ? students.filter((s) => enrolledSet.has(s.id)) : students;
          const filteredStudents = baseStudents.filter((s) => {
            const roomLabel = `${s.gradeLevel} ${s.room}`.trim();
            if (mobileGradeRoom !== 'all' && roomLabel !== mobileGradeRoom) return false;
            if (mobileGradeSearch.trim()) {
              const q = mobileGradeSearch.toLowerCase();
              const hay = `${s.firstNameTh} ${s.lastNameTh} ${s.studentIdNumber} ${s.room}`.toLowerCase();
              return hay.includes(q);
            }
            return true;
          });

          return (
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
                          { field: 'midtermScore', label: 'กลาง/30', max: 30, value: midterm },
                          { field: 'finalScore', label: 'ปลาย/40', max: 40, value: finalScore },
                          { field: 'assignmentScore', label: 'งาน/20', max: 20, value: assignment },
                          { field: 'quizScore', label: 'สอบ/10', max: 10, value: quiz },
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
          );
        })()
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

  return (
    <div className="space-y-4 pb-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">
          {lang === 'th'
            ? `ปีการศึกษา ${activeSchool.academicYear || '2569'}`
            : `AY ${activeSchool.academicYear || '2569'}`}
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

      {/* Course-by-course grades */}
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
            return (
              <div key={g.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-[var(--color-text-title)] truncate">
                    {course?.titleTh || course?.titleEn || g.courseId}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] tabular-nums truncate">
                    {course?.code || 'รายวิชา'} · คะแนนรวม {g.totalScore}/100
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-extrabold text-[var(--color-primary-text)] tabular-nums">
                    {gradeDisplay}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
