import React, { useMemo, useState } from 'react';
import { AuthUser, Course, Student, Lesson, Assignment, AppLanguage, Teacher } from '../types';
import { PagedList } from '../components/PagedList';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { 
  Play, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Upload, 
  BookOpen, 
  Video, 
  Download,
  Plus,
  Pencil,
} from 'lucide-react';
import { getModuleTone } from '../lib/moduleTheme';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';
import { resolveLinkedStudentsForUser } from '../lib/attendanceScope';
import { isSchoolPolicyEnabled, SchoolPolicyId } from '../lib/schoolPermissions';

interface LmsClassroomViewProps {
  schoolId: string;
  courses: Course[];
  students: Student[];
  teachers?: Teacher[];
  lessons: Lesson[];
  assignments: Assignment[];
  lang: AppLanguage;
  currentUser?: AuthUser | null;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  onCompleteLesson: (lessonId: string) => void | Promise<void>;
  onSaveLesson: (lesson: Lesson) => Promise<void>;
  onSubmitAssignment: (assignmentId: string) => void | Promise<void>;
}

export const LmsClassroomView: React.FC<LmsClassroomViewProps> = ({
  courses,
  schoolId,
  students,
  teachers = [],
  lessons,
  assignments,
  lang,
  currentUser,
  schoolPermissions,
  onCompleteLesson,
  onSaveLesson,
  onSubmitAssignment,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'lessons' | 'assignments' | 'discussion'>('lessons');
  const [submittedAlert, setSubmittedAlert] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [lessonForm, setLessonForm] = useState<Lesson | null>(null);
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  const currentStudentId = useMemo(() => {
    if (!currentUser || currentUser.role !== 'student') return '';
    const linked = resolveLinkedStudentsForUser(currentUser, students);
    return linked[0]?.id || currentUser.studentRecordId || currentUser.id;
  }, [currentUser, students]);
  const isStudentUser = currentUser?.role === 'student';
  const canSubmitHomework =
    isStudentUser && Boolean(currentStudentId) && isSchoolPolicyEnabled(schoolPermissions, 'student_submit_homework');
  const canManageLessons = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'teacher';

  const teacherFilterOptions = buildCourseTeacherOptions(courses, teachers);
  const filteredCourses = courses.filter((c) =>
    courseMatchesTeacherFilter(c, teacherFilter, teacherFilterOptions)
  );
  const activeCourse =
    filteredCourses.find((c) => c.id === selectedCourseId) ||
    filteredCourses[0] ||
    courses.find((c) => c.id === selectedCourseId) ||
    courses[0];
  const activeCourseIdResolved = activeCourse?.id || selectedCourseId;
  const courseLessons = lessons.filter((l) => l.courseId === activeCourseIdResolved);
  const courseAssignments = assignments.filter((a) => a.courseId === activeCourseIdResolved && a.status === 'active');
  const activeLesson = courseLessons.find((l) => l.id === selectedLessonId) || courseLessons[0];

  const handleLessonComplete = async (id: string) => {
    setSubmissionError(null);
    try {
      await onCompleteLesson(id);
      setSubmittedAlert(lang === 'th' ? 'บันทึกความคืบหน้าการเรียนบทนี้เรียบร้อยแล้ว!' : 'Lesson marked as completed!');
      setTimeout(() => setSubmittedAlert(null), 3000);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonForm || isSavingLesson) return;
    if (!lessonForm.titleTh.trim()) {
      setSubmissionError(lang === 'th' ? 'กรุณาระบุชื่อบทเรียนภาษาไทย' : 'Enter a Thai lesson title.');
      return;
    }
    setIsSavingLesson(true);
    setSubmissionError(null);
    try {
      await onSaveLesson({ ...lessonForm, schoolId });
      setSelectedCourseId(lessonForm.courseId);
      setSelectedLessonId(lessonForm.id);
      setLessonForm(null);
      setSubmittedAlert(lang === 'th' ? 'บันทึกบทเรียนแล้ว' : 'Lesson saved.');
      setTimeout(() => setSubmittedAlert(null), 3000);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingLesson(false);
    }
  };

  const startNewLesson = () => setLessonForm({
    id: `lesson-${crypto.randomUUID()}`,
    schoolId,
    courseId: activeCourseIdResolved,
    chapterNumber: Math.max(0, ...courseLessons.map((lesson) => lesson.chapterNumber)) + 1,
    titleTh: '', titleEn: '', durationMinutes: 10, videoUrl: '', content: '', materials: [], completedByStudentIds: [],
  });

  const handleAssignmentSubmit = async (id: string) => {
    if (isSubmittingAssignment) return;
    setIsSubmittingAssignment(true);
    setSubmissionError(null);
    setSubmittedAlert(null);
    try {
      await onSubmitAssignment(id);
      setSubmittedAlert(
        lang === 'th'
          ? 'ส่งการบ้านเรียบร้อยแล้ว'
          : 'Assignment submitted successfully.'
      );
      setTimeout(() => setSubmittedAlert(null), 3000);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const completedCount = courseLessons.filter((l) =>
    currentStudentId ? l.completedByStudentIds.includes(currentStudentId) : l.completedByStudentIds.length > 0
  ).length;
  const progressPercent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;

  return (
    <div className={`space-y-3 ${getModuleTone('courses')}`}>
      {/* Compact Classroom Header */}
      <div className="shrink-0 px-3 py-2 app-page-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg tone-chip shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
            {lang === 'th' ? activeCourse?.titleTh : activeCourse?.titleEn}
          </h1>
          <span className="hidden sm:inline text-xs text-[var(--color-text-muted)] truncate">
            · {activeCourse?.code} · {activeCourse?.teacherName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <ModuleTourTrigger moduleId="lms_classroom" lang={lang} />
          {canManageLessons && (
            <button type="button" onClick={startNewLesson} className="px-2.5 py-1.5 rounded-lg bg-[var(--tone-solid)] text-white text-xs font-semibold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />{lang === 'th' ? 'เพิ่มบทเรียน' : 'Add lesson'}
            </button>
          )}
          {submittedAlert && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{submittedAlert}</span>
            </div>
          )}
          {submissionError && (
            <div role="alert" className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs">
              {submissionError}
            </div>
          )}
          <div className="px-2.5 py-1 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs flex items-center gap-1.5">
            <span className="text-[var(--color-text-muted)]">{lang === 'th' ? 'ความคืบหน้า:' : 'Progress:'}</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono tabular-nums">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {lessonForm && (
        <section className="rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3" aria-label={lang === 'th' ? 'แบบฟอร์มบทเรียน' : 'Lesson editor'}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-[var(--color-text-title)]">{lang === 'th' ? 'จัดการบทเรียน' : 'Lesson editor'}</h2>
            <button type="button" onClick={() => setLessonForm(null)} className="text-sm text-[var(--color-text-muted)]">{lang === 'th' ? 'ปิด' : 'Cancel'}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1">{lang === 'th' ? 'รายวิชา' : 'Course'}
              <select value={lessonForm.courseId} onChange={(e) => setLessonForm({ ...lessonForm, courseId: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm">
                {filteredCourses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.titleTh}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">{lang === 'th' ? 'บทที่' : 'Chapter'}
              <input type="number" min="1" value={lessonForm.chapterNumber} onChange={(e) => setLessonForm({ ...lessonForm, chapterNumber: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm" />
            </label>
            <label className="text-xs space-y-1">{lang === 'th' ? 'ชื่อบทเรียน (ไทย)' : 'Title (Thai)'}
              <input value={lessonForm.titleTh} onChange={(e) => setLessonForm({ ...lessonForm, titleTh: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm" />
            </label>
            <label className="text-xs space-y-1">{lang === 'th' ? 'ชื่อบทเรียน (อังกฤษ)' : 'Title (English)'}
              <input value={lessonForm.titleEn} onChange={(e) => setLessonForm({ ...lessonForm, titleEn: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm" />
            </label>
            <label className="text-xs space-y-1">{lang === 'th' ? 'ระยะเวลา (นาที)' : 'Duration (minutes)'}
              <input type="number" min="1" value={lessonForm.durationMinutes} onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm" />
            </label>
            <label className="text-xs space-y-1">Video URL
              <input type="url" value={lessonForm.videoUrl || ''} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm" />
            </label>
            <label className="text-xs space-y-1 sm:col-span-2">{lang === 'th' ? 'เนื้อหา' : 'Content'}
              <textarea rows={4} value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2 text-sm" />
            </label>
          </div>
          <button type="button" disabled={isSavingLesson || filteredCourses.length === 0} onClick={() => void handleSaveLesson()} className="px-4 py-2 rounded-lg bg-[var(--tone-solid)] text-white text-sm font-semibold disabled:opacity-50">
            {isSavingLesson ? (lang === 'th' ? 'กำลังบันทึก…' : 'Saving…') : (lang === 'th' ? 'บันทึกบทเรียน' : 'Save lesson')}
          </button>
        </section>
      )}

      {/* Course Switcher Tabs with Teacher Filter */}
      <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--color-border)]">
        {teacherFilterOptions.length > 0 && (
          <select
            aria-label="กรองวิชาตามรายชื่อครู"
            value={teacherFilter}
            onChange={(e) => {
              const nextTeacher = e.target.value;
              setTeacherFilter(nextTeacher);
              const nextCourses = courses.filter((c) =>
                courseMatchesTeacherFilter(c, nextTeacher, teacherFilterOptions)
              );
              if (nextCourses.length > 0 && !nextCourses.some((c) => c.id === activeCourseIdResolved)) {
                setSelectedCourseId(nextCourses[0].id);
                const firstL = lessons.find((l) => l.courseId === nextCourses[0].id);
                if (firstL) setSelectedLessonId(firstL.id);
              }
            }}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-title)] outline-none focus:border-[var(--tone)]"
          >
            <option value="all">
              {lang === 'th'
                ? `ครูผู้สอนทุกคน (${teacherFilterOptions.length})`
                : `All Teachers (${teacherFilterOptions.length})`}
            </option>
            {teacherFilterOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        )}
        {filteredCourses.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCourseId(c.id);
              const firstL = lessons.find((l) => l.courseId === c.id);
              if (firstL) setSelectedLessonId(firstL.id);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              activeCourseIdResolved === c.id
                ? 'bg-[var(--tone-solid)] text-white border-[var(--tone-solid)] shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--tone-soft)] border-[var(--color-border)]'
            }`}
          >
            <span className="font-mono mr-1.5">{c.code}</span>
            <span>{lang === 'th' ? c.titleTh : c.titleEn}</span>
          </button>
        ))}
      </div>

      {/* Navigation Sub-tabs */}
      <div className="shrink-0 seg-tab-group w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          data-guide-id="lms-lessons-tab"
          data-active={activeTab === 'lessons'}
          onClick={() => setActiveTab('lessons')}
          className="seg-tab-btn"
        >
          {lang === 'th' ? '📚 บทเรียนวิดีโอ & สื่อการสอน' : '📚 Video Lessons & Notes'}
        </button>
        <button
          data-guide-id="lms-homework-tab"
          data-active={activeTab === 'assignments'}
          onClick={() => setActiveTab('assignments')}
          className="seg-tab-btn"
        >
          {lang === 'th' ? '📝 การบ้าน & ใบงานออนไลน์' : '📝 Assignments & Tasks'}
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="space-y-4">
      {/* Main LMS Split View */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-3">
          {/* Main Video & Content Player */}
          <div className="lg:col-span-8 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 space-y-5 shadow-xs">
            {activeLesson ? (
              <>
                <div className="aspect-video rounded-xl bg-slate-950 border border-slate-700 overflow-hidden relative group flex items-center justify-center">
                  {activeLesson.videoUrl ? (
                    <iframe
                      src={activeLesson.videoUrl}
                      title={activeLesson.titleEn}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Video className="w-8 h-8 text-indigo-300 mx-auto" />
                      <p className="text-sm font-semibold text-white">Live Stream &amp; Interactive Lesson</p>
                      <p className="text-xs text-slate-200">Class meets via EduVerse Cloud Stream</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-[var(--color-primary-text)]">
                        {lang === 'th' ? `บทที่ ${activeLesson.chapterNumber}` : `Chapter ${activeLesson.chapterNumber}`} • {activeLesson.durationMinutes} mins
                      </span>
                      <h2 className="text-lg font-bold text-[var(--color-text-title)] mt-0.5">
                        {lang === 'th' ? activeLesson.titleTh : activeLesson.titleEn}
                      </h2>
                    </div>

                    {isStudentUser && (
                    <button
                      disabled={Boolean(currentStudentId && activeLesson.completedByStudentIds.includes(currentStudentId))}
                      onClick={() => void handleLessonComplete(activeLesson.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{currentStudentId && activeLesson.completedByStudentIds.includes(currentStudentId) ? (lang === 'th' ? 'เรียนจบแล้ว' : 'Completed') : (lang === 'th' ? 'ทำเครื่องหมายว่าเรียนจบแล้ว' : 'Mark Lesson Complete')}</span>
                    </button>
                    )}
                    {canManageLessons && (
                      <button type="button" onClick={() => setLessonForm({ ...activeLesson })} className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />{lang === 'th' ? 'แก้ไขบทเรียน' : 'Edit lesson'}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[var(--color-text-body)] leading-relaxed bg-[var(--color-card-subtle)] p-4 rounded-xl border border-[var(--color-border)]">
                    {activeLesson.content}
                  </p>

                  {/* Lesson Materials */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      {lang === 'th' ? 'เอกสารประกอบการเรียนดาวน์โหลด' : 'Downloadable Lesson Files'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <PagedList items={activeLesson.materials} pageSize={4} renderItem={(mat, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs hover:border-[var(--color-primary)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--color-primary-text)]" />
                            <span className="text-[var(--color-text-title)] font-medium truncate">{mat.name}</span>
                          </div>
                          <button className="text-[var(--color-primary-text)] hover:underline flex items-center gap-1 text-[11px] cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-12">
                {lang === 'th' ? 'ไม่มีบทเรียนในรายวิชานี้' : 'No lessons available for this course.'}
              </p>
            )}
          </div>

          {/* Right: Chapter Playlist */}
          <div className="lg:col-span-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-primary-text)]" />
              {lang === 'th' ? 'สารบัญบทเรียนทั้งหมด' : 'Course Curriculum'}
            </h3>

            <div className="space-y-2.5">
              <PagedList items={courseLessons} pageSize={3} renderItem={(les) => {
                const isSelected = activeLesson?.id === les.id;
                const isDone = currentStudentId
                  ? les.completedByStudentIds.includes(currentStudentId)
                  : les.completedByStudentIds.length > 0;
                return (
                  <div
                    key={les.id}
                    onClick={() => setSelectedLessonId(les.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-xs'
                        : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--color-primary-text)] font-bold block">
                          {lang === 'th' ? `บทที่ ${les.chapterNumber}` : `Chapter ${les.chapterNumber}`}
                        </span>
                        <h4 className="text-xs font-semibold text-[var(--color-text-title)] mt-0.5 line-clamp-2">
                          {lang === 'th' ? les.titleTh : les.titleEn}
                        </h4>
                      </div>

                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0 mt-1" />
                      ) : (
                        <Play className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-1" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--color-text-muted)]">
                      <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <span>{les.durationMinutes} นาที</span>
                      <span>•</span>
                      <span>{les.materials.length} ไฟล์แนบ</span>
                    </div>
                  </div>
                );
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Assignments View */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PagedList items={courseAssignments} pageSize={2} renderItem={(asg) => {
              const isSubmitted = currentStudentId
                ? (asg.submittedStudentIds || []).includes(currentStudentId)
                : false;
              return (
                <div
                  key={asg.id}
                  className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
                        {asg.maxScore ?? asg.points} {lang === 'th' ? 'คะแนนเต็ม' : 'Points'}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--color-text-title)] mt-2">
                        {lang === 'th' ? asg.titleTh : asg.titleEn}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        isSubmitted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {isSubmitted
                        ? (lang === 'th' ? 'ส่งแล้ว' : 'Submitted')
                        : (lang === 'th' ? 'ยังไม่ได้ส่ง' : 'Pending')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3.5 h-3.5 text-rose-700 dark:text-rose-300" />
                    <span>
                      {lang === 'th' ? 'กำหนดส่ง:' : 'Due:'} <strong className="text-[var(--color-text-title)]">{asg.dueDate}</strong>
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {(asg.submittedStudentIds || []).length} {lang === 'th' ? 'คนส่งแล้วในชั้นเรียน' : 'submissions'}
                    </span>

                    {isStudentUser && !isSubmitted && (
                      canSubmitHomework ? (
                        <button
                          type="button"
                          disabled={isSubmittingAssignment}
                          onClick={() => void handleAssignmentSubmit(asg.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-[var(--tone-solid)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isSubmittingAssignment
                            ? (lang === 'th' ? 'กำลังส่ง...' : 'Submitting...')
                            : (lang === 'th' ? 'ส่งงานให้อาจารย์' : 'Submit Homework')}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          {lang === 'th' ? 'โรงเรียนปิดการส่งงานออนไลน์ชั่วคราว' : 'Online submission paused'}
                        </span>
                      )
                    )}
                    {isStudentUser && isSubmitted && (
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'th' ? 'ส่งงานเรียบร้อย' : 'Turned In'}
                      </span>
                    )}
                  </div>
                </div>
              );
            }} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
