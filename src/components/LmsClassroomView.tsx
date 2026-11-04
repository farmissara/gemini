import React, { useState } from 'react';
import { Course, Student, Lesson, Assignment, AppLanguage } from '../types';
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
    <div className="space-y-6">
      {/* Classroom Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900/80 via-indigo-900/90 to-purple-950 border border-indigo-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'th' ? 'ห้องเรียนออนไลน์เสมือนจริง • EduVerse LMS' : 'Virtual Classroom • EduVerse LMS'}
            </span>
            <h1 className="text-2xl font-black text-white">
              {lang === 'th' ? activeCourse?.titleTh : activeCourse?.titleEn}
            </h1>
            <p className="text-xs text-indigo-200">
              {activeCourse?.code} • {activeCourse?.teacherName} • {activeCourse?.department}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs">
              <span className="text-slate-400 block text-[10px]">
                {lang === 'th' ? 'ความคืบหน้าบทเรียน' : 'Course Progress'}
              </span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {submittedAlert && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{submittedAlert}</span>
          </div>
        )}
      </div>

      {/* Course Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCourseId(c.id);
              const firstL = lessons.find((l) => l.courseId === c.id);
              if (firstL) setSelectedLessonId(firstL.id);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCourseId === c.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span className="font-mono mr-1.5">{c.code}</span>
            <span>{lang === 'th' ? c.titleTh : c.titleEn}</span>
          </button>
        ))}
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'lessons'
              ? 'bg-slate-800 text-white border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'th' ? '📚 บทเรียนวิดีโอ & สื่อการสอน' : '📚 Video Lessons & Notes'}
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === 'assignments'
              ? 'bg-slate-800 text-white border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'th' ? '📝 การบ้าน & ใบงานออนไลน์' : '📝 Assignments & Tasks'}
        </button>
      </div>

      {/* Main LMS Split View */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Video & Content Player */}
          <div className="lg:col-span-8 rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-xl">
            {activeLesson ? (
              <>
                <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative group flex items-center justify-center">
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
                      <Video className="w-12 h-12 text-indigo-400 mx-auto" />
                      <p className="text-sm font-semibold text-white">Live Stream &amp; Interactive Lesson</p>
                      <p className="text-xs text-slate-400">Class meets via EduVerse Cloud Stream</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-indigo-400">
                        {lang === 'th' ? `บทที่ ${activeLesson.chapterNumber}` : `Chapter ${activeLesson.chapterNumber}`} • {activeLesson.durationMinutes} mins
                      </span>
                      <h2 className="text-lg font-bold text-white mt-0.5">
                        {lang === 'th' ? activeLesson.titleTh : activeLesson.titleEn}
                      </h2>
                    </div>

                    <button
                      onClick={() => handleLessonComplete(activeLesson.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all self-start sm:self-auto"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'th' ? 'ทำเครื่องหมายว่าเรียนจบแล้ว' : 'Mark Lesson Complete'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    {activeLesson.content}
                  </p>

                  {/* Lesson Materials */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'th' ? 'เอกสารประกอบการเรียนดาวน์โหลด' : 'Downloadable Lesson Files'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeLesson.materials.map((mat, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs hover:border-indigo-500 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span className="text-slate-200 font-medium truncate">{mat.name}</span>
                          </div>
                          <button className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-12">
                {lang === 'th' ? 'ไม่มีบทเรียนในรายวิชานี้' : 'No lessons available for this course.'}
              </p>
            )}
          </div>

          {/* Right: Chapter Playlist */}
          <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              {lang === 'th' ? 'สารบัญบทเรียนทั้งหมด' : 'Course Curriculum'}
            </h3>

            <div className="space-y-2.5">
              {courseLessons.map((les) => {
                const isSelected = activeLesson?.id === les.id;
                const isDone = les.completedByStudentIds.includes('stu-1');
                return (
                  <div
                    key={les.id}
                    onClick={() => setSelectedLessonId(les.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 font-bold block">
                          {lang === 'th' ? `บทที่ ${les.chapterNumber}` : `Chapter ${les.chapterNumber}`}
                        </span>
                        <h4 className="text-xs font-semibold text-white mt-0.5 line-clamp-2">
                          {lang === 'th' ? les.titleTh : les.titleEn}
                        </h4>
                      </div>

                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                      ) : (
                        <Play className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{les.durationMinutes} นาที</span>
                      <span>•</span>
                      <span>{les.materials.length} ไฟล์แนบ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Assignments View */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseAssignments.map((asg) => {
              const isSubmitted = asg.submittedStudentIds.includes('stu-1');
              return (
                <div
                  key={asg.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {asg.points} {lang === 'th' ? 'คะแนนเต็ม' : 'Points'}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2">
                        {lang === 'th' ? asg.titleTh : asg.titleEn}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        isSubmitted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isSubmitted
                        ? (lang === 'th' ? 'ส่งแล้ว' : 'Submitted')
                        : (lang === 'th' ? 'ยังไม่ได้ส่ง' : 'Pending')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      {lang === 'th' ? 'กำหนดส่ง:' : 'Due:'} <strong className="text-slate-200">{asg.dueDate}</strong>
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {asg.submittedStudentIds.length} {lang === 'th' ? 'คนส่งแล้วในชั้นเรียน' : 'submissions'}
                    </span>

                    {!isSubmitted ? (
                      <button
                        onClick={() => handleAssignmentSubmit(asg.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'อัปโหลดงานส่งอาจารย์' : 'Submit Homework'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'th' ? 'ส่งงานเรียบร้อย' : 'Turned In'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
