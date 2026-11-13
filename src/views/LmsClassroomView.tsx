import React, { useState } from 'react';
import { Course, Student, Lesson, Assignment, AppLanguage } from '../types';
import { PagedList } from '../components/PagedList';
import { 
  Play, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Upload, 
  BookOpen, 
  Video, 
  Download, 
  Sparkles,
  ChevronRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface LmsClassroomViewProps {
  courses: Course[];
  students: Student[];
  lessons: Lesson[];
  assignments: Assignment[];
  lang: AppLanguage;
  onCompleteLesson: (lessonId: string) => void;
  onSubmitAssignment: (assignmentId: string) => void;
}

export const LmsClassroomView: React.FC<LmsClassroomViewProps> = ({
  courses,
  students,
  lessons,
  assignments,
  lang,
  onCompleteLesson,
  onSubmitAssignment,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'lessons' | 'assignments' | 'discussion'>('lessons');
  const [submittedAlert, setSubmittedAlert] = useState<string | null>(null);

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const courseLessons = lessons.filter((l) => l.courseId === selectedCourseId);
  const courseAssignments = assignments.filter((a) => a.courseId === selectedCourseId);
  const activeLesson = courseLessons.find((l) => l.id === selectedLessonId) || courseLessons[0];

  const handleLessonComplete = (id: string) => {
    onCompleteLesson(id);
    setSubmittedAlert(
      lang === 'th'
        ? 'บันทึกความคืบหน้าการเรียนบทนี้เรียบร้อยแล้ว!'
        : 'Lesson marked as completed!'
    );
    setTimeout(() => setSubmittedAlert(null), 3000);
  };

  const handleAssignmentSubmit = (id: string) => {
    onSubmitAssignment(id);
    setSubmittedAlert(
      lang === 'th'
        ? 'ส่งการบ้านเรียบร้อยแล้ว! ระบบได้ส่งแจ้งเตือนให้อาจารย์ผู้สอนแล้ว'
        : 'Assignment submitted successfully! Notification sent to instructor.'
    );
    setTimeout(() => setSubmittedAlert(null), 3000);
  };

  const completedCount = courseLessons.filter(l => l.completedByStudentIds.includes('stu-1')).length;
  const progressPercent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Compact Classroom Header */}
      <div className="shrink-0 p-3 app-page-header flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] truncate">
            {lang === 'th' ? activeCourse?.titleTh : activeCourse?.titleEn}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {activeCourse?.code} · {activeCourse?.teacherName} · {activeCourse?.department}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {submittedAlert && (
            <div className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{submittedAlert}</span>
            </div>
          )}
          <div className="px-3 py-1 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs flex items-center gap-1.5">
            <span className="text-[var(--color-text-muted)]">{lang === 'th' ? 'ความคืบหน้า:' : 'Progress:'}</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono tabular-nums">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Course Switcher Tabs */}
      <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-[var(--color-border)]">
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCourseId(c.id);
              const firstL = lessons.find((l) => l.courseId === c.id);
              if (firstL) setSelectedLessonId(firstL.id);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCourseId === c.id
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-[var(--color-card)] text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <span className="font-mono mr-1.5">{c.code}</span>
            <span>{lang === 'th' ? c.titleTh : c.titleEn}</span>
          </button>
        ))}
      </div>

      {/* Navigation Sub-tabs */}
      <div className="shrink-0 flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
            activeTab === 'lessons'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
              : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          {lang === 'th' ? '📚 บทเรียนวิดีโอ & สื่อการสอน' : '📚 Video Lessons & Notes'}
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
            activeTab === 'assignments'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
              : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
          }`}
        >
          {lang === 'th' ? '📝 การบ้าน & ใบงานออนไลน์' : '📝 Assignments & Tasks'}
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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
                      <Video className="w-12 h-12 text-indigo-300 mx-auto" />
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

                    <button
                      onClick={() => handleLessonComplete(activeLesson.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ทำเครื่องหมายว่าเรียนจบแล้ว' : 'Mark Lesson Complete'}</span>
                    </button>
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
                const isDone = les.completedByStudentIds.includes('stu-1');
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
              const isSubmitted = asg.submittedStudentIds.includes('stu-1');
              return (
                <div
                  key={asg.id}
                  className="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
                        {asg.points} {lang === 'th' ? 'คะแนนเต็ม' : 'Points'}
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
                      {asg.submittedStudentIds.length} {lang === 'th' ? 'คนส่งแล้วในชั้นเรียน' : 'submissions'}
                    </span>

                    {!isSubmitted ? (
                      <button
                        onClick={() => handleAssignmentSubmit(asg.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'อัปโหลดงานส่งอาจารย์' : 'Submit Homework'}</span>
                      </button>
                    ) : (
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
