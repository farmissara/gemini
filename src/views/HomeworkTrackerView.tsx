import React, { useState } from 'react';
import { 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Award, 
  Send, 
  MessageSquare, 
  BookOpen,
  Calendar,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { 
  HomeworkSubmission, 
  Student, 
  Course, 
  AppLanguage, 
  UserRole,
  Assignment,
  Teacher
} from '../types';
import { PagedList } from '../components/PagedList';
import { GoogleCalendarSyncModal } from '../components/GoogleCalendarSyncModal';
import { ModuleTourTrigger } from '../components/guide/GuideTourContext';
import { addCalendarDays, getBangkokDateInputValue, getCalendarWeekStart } from '../lib/timetableCalendar';
import { getHomeworkDuplicateReasons } from '../lib/duplicateRecords';
import { TableActionMenu, TableActionItem } from '../components/common/TableActionMenu';
import { getModuleTone } from '../lib/moduleTheme';
import { buildCourseTeacherOptions, courseMatchesTeacherFilter } from '../lib/courseTeacherFilter';
import { PaginatedTableRows } from '../components/common/PaginatedTableRows';
import { isSchoolPolicyEnabled, SchoolPolicyId } from '../lib/schoolPermissions';

interface HomeworkTrackerViewProps {
  submissions: HomeworkSubmission[];
  students: Student[];
  teachers?: Teacher[];
  courses: Course[];
  assignments?: Assignment[];
  schoolId?: string;
  schoolName?: string;
  schoolPermissions?: Record<SchoolPolicyId, boolean>;
  onCreateAssignment: (assignment: Assignment) => void | Promise<void>;
  onAddSubmission: (sub: HomeworkSubmission) => void | Promise<void>;
  onGradeSubmission: (id: string, score: number, feedback: string) => void | Promise<void>;
  lang: AppLanguage;
  currentRole: UserRole;
}

export const HomeworkTrackerView: React.FC<HomeworkTrackerViewProps> = ({
  submissions,
  students,
  teachers = [],
  courses,
  assignments = [],
  schoolId = 'sch-bkk-01',
  schoolName = 'EduVerse School',
  schoolPermissions,
  onCreateAssignment,
  onAddSubmission,
  onGradeSubmission,
  lang,
  currentRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'late' | 'pending' | 'graded'>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [hwTab, setHwTab] = useState<'submissions' | 'assignments' | 'pending'>('submissions');
  
  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [selectedSubForGrading, setSelectedSubForGrading] = useState<HomeworkSubmission | null>(null);
  const calendarWeekStart = getCalendarWeekStart(getBangkokDateInputValue());
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Student submission form
  const [submitStudentId, setSubmitStudentId] = useState<string>(students[0]?.id || '');
  const [submitAssignmentId, setSubmitAssignmentId] = useState<string>('');
  const [submitText, setSubmitText] = useState('');
  const [allowDuplicateConfirm, setAllowDuplicateConfirm] = useState(false);

  // Teacher assignment form
  const [assignmentCourseId, setAssignmentCourseId] = useState('');
  const [assignmentTitleTh, setAssignmentTitleTh] = useState('');
  const [assignmentTitleEn, setAssignmentTitleEn] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentPoints, setAssignmentPoints] = useState('');

  // Grading form
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState('');

  const teacherFilterOptions = buildCourseTeacherOptions(courses, teachers);
  const teacherFilteredCourses = courses.filter((c) =>
    courseMatchesTeacherFilter(c, teacherFilter, teacherFilterOptions)
  );
  const canManageAssignments =
    currentRole === 'admin' ||
    currentRole === 'super_admin' ||
    (currentRole === 'teacher' && isSchoolPolicyEnabled(schoolPermissions, 'teacher_homework'));
  const canStudentSubmit = currentRole === 'student' && isSchoolPolicyEnabled(schoolPermissions, 'student_submit_homework');
  const activeAssignments = assignments.filter((assignment) => assignment.status === 'active');

  const matchesTeacherAndCourse = (courseCode?: string, courseId?: string) => {
    const normalizedCode = (courseCode || '').trim().toLowerCase();
    const matchedCourse = courses.find(
      (c) => (courseId && c.id === courseId) || (normalizedCode && c.code.trim().toLowerCase() === normalizedCode)
    );
    if (teacherFilter !== 'all') {
      if (!matchedCourse || !courseMatchesTeacherFilter(matchedCourse, teacherFilter, teacherFilterOptions)) {
        return false;
      }
    }
    if (courseFilter !== 'all') {
      const targetCourse = courses.find((c) => c.id === courseFilter || c.code === courseFilter);
      if (targetCourse) {
        return (
          (courseId && courseId === targetCourse.id) ||
          (normalizedCode && normalizedCode === targetCourse.code.trim().toLowerCase())
        );
      }
      return normalizedCode === courseFilter.trim().toLowerCase();
    }
    return true;
  };

  const filteredSubmissions = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = s.assignmentTitle.toLowerCase().includes(q) ||
      s.studentName.toLowerCase().includes(q) ||
      s.courseCode.toLowerCase().includes(q) ||
      (s.courseTitleTh || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchCourseAndTeacher = matchesTeacherAndCourse(s.courseCode);
    return matchSearch && matchStatus && matchCourseAndTeacher;
  });

  const filteredAssignments = assignments.filter((asg) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      (asg.titleTh || '').toLowerCase().includes(q) ||
      (asg.description || '').toLowerCase().includes(q) ||
      (asg.courseCode || '').toLowerCase().includes(q);
    return matchSearch && matchesTeacherAndCourse(asg.courseCode, asg.courseId);
  });

  const filteredPendingSubmissions = submissions.filter(
    (s) => s.status === 'pending' && matchesTeacherAndCourse(s.courseCode) && (
      !searchTerm.trim() ||
      s.assignmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedSubmitAssignment = assignments.find((assignment) => assignment.id === submitAssignmentId);
  const submitDupReasons = showSubmitModal && selectedSubmitAssignment
    ? getHomeworkDuplicateReasons(
        {
          studentId: submitStudentId,
          assignmentId: selectedSubmitAssignment.id,
          courseCode: selectedSubmitAssignment.courseCode || '',
        },
        submissions
      )
    : [];

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find((item) => item.id === assignmentCourseId);
    const points = Number(assignmentPoints);
    if (!course) {
      setAssignmentError(lang === 'th' ? 'กรุณาเลือกรายวิชา' : 'Select a course.');
      return;
    }
    if (!assignmentTitleTh.trim() || !assignmentDueDate || !Number.isFinite(points) || points <= 0) {
      setAssignmentError(lang === 'th' ? 'กรุณากรอกชื่อ งานกำหนดส่ง และคะแนนเต็มให้ถูกต้อง' : 'Enter a title, due date, and a valid maximum score.');
      return;
    }
    setIsSavingAssignment(true);
    setAssignmentError(null);
    try {
      await onCreateAssignment({
        id: `assignment-${crypto.randomUUID()}`,
        schoolId,
        courseId: course.id,
        courseCode: course.code,
        titleTh: assignmentTitleTh.trim(),
        titleEn: assignmentTitleEn.trim() || assignmentTitleTh.trim(),
        description: assignmentDescription.trim(),
        dueDate: assignmentDueDate,
        points,
        maxScore: points,
        submittedStudentIds: [],
        status: 'active',
      });
      setShowAssignmentModal(false);
      setHwTab('assignments');
      setAssignmentTitleTh('');
      setAssignmentTitleEn('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
      setAssignmentPoints('');
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === submitStudentId);
    const assignment = selectedSubmitAssignment;
    if (!student || !assignment) {
      setSubmitError(lang === 'th' ? 'กรุณาเลือกนักเรียนและงานที่ต้องการส่ง' : 'Select a student and assignment.');
      return;
    }
    if (submitDupReasons.length > 0 && !allowDuplicateConfirm) return;

    setIsSubmittingHomework(true);
    setSubmitError(null);
    try {
      const course = courses.find((item) => item.id === assignment.courseId);
      const submittedAt = new Date().toISOString();
      await onAddSubmission({
        id: `submission-${crypto.randomUUID()}`,
        schoolId: student.schoolId,
        assignmentId: assignment.id,
        assignmentTitle: assignment.titleTh,
        courseCode: assignment.courseCode || course?.code || '',
        courseTitleTh: course?.titleTh || '',
        studentId: student.id,
        studentName: `${student.firstNameTh} ${student.lastNameTh}`.trim(),
        studentRoom: student.room,
        dueDate: assignment.dueDate,
        submittedAt,
        status: getBangkokDateInputValue() <= assignment.dueDate ? 'submitted' : 'late',
        textSubmission: submitText.trim() || undefined,
        maxScore: assignment.maxScore ?? assignment.points,
      });
      setAllowDuplicateConfirm(false);
      setShowSubmitModal(false);
      setSubmitText('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmittingHomework(false);
    }
  };

  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForGrading) return;
    setIsSavingGrade(true);
    setGradeError(null);
    try {
      await onGradeSubmission(selectedSubForGrading.id, gradingScore, gradingFeedback);
      setSelectedSubForGrading(null);
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingGrade(false);
    }
  };

  const getStatusBadge = (status: HomeworkSubmission['status']) => {
    switch (status) {
      case 'graded':
        return { label: 'ตรวจและให้คะแนนแล้ว', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' };
      case 'submitted':
        return { label: 'ส่งตรงเวลา (รอตรวจ)', color: 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700' };
      case 'late':
        return { label: 'ส่งช้ากว่ากำหนด', color: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' };
      case 'pending':
        return { label: 'ยังไม่ส่ง (ค้างส่ง)', color: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700' };
    }
  };

  return (
    <div className={`${getModuleTone('homework')} h-full flex flex-col min-h-0 overflow-hidden space-y-1.5`}>
      {/* Compact Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-1.5 px-3 py-1.5 app-page-header">
        <div className="flex items-center gap-2 min-w-0">
          <span className="tone-chip w-7 h-7 rounded-lg">
            <FileCheck2 className="w-4 h-4 shrink-0" />
          </span>
          <h1 className="text-sm sm:text-base font-bold text-[var(--color-text-title)] truncate">
            {lang === 'th' ? 'การบ้าน & ติดตามการส่งงาน' : 'Homework & Submissions'}
          </h1>
          <ModuleTourTrigger moduleId="homework" lang={lang} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Subtabs Navigation */}
          <div data-guide-id="homework-subtabs" className="seg-tab-group overflow-x-auto no-scrollbar">
            <button
              type="button"
              data-active={hwTab === 'submissions'}
              onClick={() => setHwTab('submissions')}
              className="seg-tab-btn"
            >
              1. ส่งงาน ({submissions.length})
            </button>
            <button
              type="button"
              data-active={hwTab === 'assignments'}
              onClick={() => setHwTab('assignments')}
              className="seg-tab-btn"
            >
              2. งานที่สั่ง ({assignments.length})
            </button>
            <button
              type="button"
              data-active={hwTab === 'pending'}
              onClick={() => setHwTab('pending')}
              className="seg-tab-btn"
            >
              3. ค้างส่ง ({submissions.filter(s => s.status === 'pending').length})
            </button>
          </div>

          <button
            type="button"
            data-guide-id="homework-gcal-sync"
            onClick={() => setShowGoogleCalendarModal(true)}
            className="btn-tool-tone px-2.5 py-1.5"
          >
            <Calendar className="w-3.5 h-3.5 tone-text" />
            <span>{lang === 'th' ? 'ซิงค์ Calendar' : 'Calendar'}</span>
          </button>

          {canManageAssignments ? (
            <button
              type="button"
              data-guide-id="homework-create-assignment-btn"
              onClick={() => {
                const selectedCourse = courses.find((course) => course.id === courseFilter || course.code === courseFilter);
                setAssignmentCourseId(selectedCourse?.id || teacherFilteredCourses[0]?.id || '');
                setAssignmentError(null);
                setShowAssignmentModal(true);
              }}
              className="btn-action-primary px-3 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'สร้างงานใหม่' : 'Create Assignment'}</span>
            </button>
          ) : currentRole === 'student' ? (
            <button
              type="button"
              data-guide-id="homework-submit-btn"
              onClick={() => {
                setSubmitStudentId(students[0]?.id || '');
                setSubmitAssignmentId(activeAssignments[0]?.id || '');
                setSubmitError(null);
                setAllowDuplicateConfirm(false);
                setShowSubmitModal(true);
              }}
              disabled={!canStudentSubmit || activeAssignments.length === 0 || students.length === 0}
              className="btn-action-primary px-3 py-1.5 disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{canStudentSubmit
                ? (lang === 'th' ? 'ส่งการบ้าน' : 'Submit Homework')
                : (lang === 'th' ? 'ปิดรับส่งงานออนไลน์' : 'Online submission paused')}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Shared Course & Teacher Filter Bar across all Homework tabs */}
      <div className="shrink-0 toolbar-filter-zone flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-44 sm:max-w-60">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาวิชา / หัวข้องาน / ชื่อนักเรียน...' : 'Search tasks or students...'}
            className="w-full bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs pl-7 pr-2.5 py-1.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--tone)]"
          />
        </div>

        {teacherFilterOptions.length > 0 && (
          <select
            aria-label="กรองวิชาตามรายชื่อครู"
            value={teacherFilter}
            onChange={(e) => {
              const nextTeacher = e.target.value;
              setTeacherFilter(nextTeacher);
              if (courseFilter !== 'all') {
                const selectedCourse = courses.find((c) => c.id === courseFilter || c.code === courseFilter);
                if (selectedCourse && !courseMatchesTeacherFilter(selectedCourse, nextTeacher, teacherFilterOptions)) {
                  setCourseFilter('all');
                }
              }
            }}
            className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--tone)] max-w-56"
          >
            <option value="all">{lang === 'th' ? `ครูผู้สอนทุกคน (${teacherFilterOptions.length})` : `All Teachers (${teacherFilterOptions.length})`}</option>
            {teacherFilterOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label} ({opt.count} วิชา)
              </option>
            ))}
          </select>
        )}

        <select
          aria-label="กรองตามรายวิชา"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--tone)] max-w-60"
        >
          <option value="all">
            {lang === 'th'
              ? `ทุกรายวิชา (${teacherFilteredCourses.length})`
              : `All Courses (${teacherFilteredCourses.length})`}
          </option>
          {teacherFilteredCourses.map((c) => (
            <option key={c.id} value={c.code}>
              {c.code} — {lang === 'th' ? c.titleTh : c.titleEn}
            </option>
          ))}
        </select>

        {hwTab === 'submissions' && (
          <select
            aria-label="กรองสถานะส่งงาน"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)]"
          >
            <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
            <option value="graded">{lang === 'th' ? 'ตรวจแล้ว' : 'Graded'}</option>
            <option value="submitted">{lang === 'th' ? 'ส่งแล้ว (รอตรวจ)' : 'Submitted'}</option>
            <option value="late">{lang === 'th' ? 'ส่งล่าช้า' : 'Late'}</option>
            <option value="pending">{lang === 'th' ? 'ยังไม่ส่ง' : 'Pending'}</option>
          </select>
        )}

        {(searchTerm.trim() || teacherFilter !== 'all' || courseFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setTeacherFilter('all');
              setCourseFilter('all');
              setStatusFilter('all');
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer whitespace-nowrap"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* TAB 1: SUBMISSIONS LIST */}
      {hwTab === 'submissions' && (
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-xs flex flex-col overflow-hidden">
          <div className="shrink-0 p-2.5 px-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                {lang === 'th' ? 'รายการส่งการบ้านรายบุคคล' : 'Homework Submissions List'}
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)]">
              {filteredSubmissions.length} / {submissions.length}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="table-comfortable w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-title)] uppercase">
                  <th className="p-2.5">{lang === 'th' ? 'หัวข้อการบ้าน / วิชา' : 'Assignment & Course'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'กำหนดส่ง / ส่งเมื่อ' : 'Due / Submitted'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'ไฟล์งานที่แนบ' : 'Attached File'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'คะแนน' : 'Score'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                  <th className="p-2.5 text-right w-16">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <PaginatedTableRows items={filteredSubmissions} colSpan={7} renderRow={(sub) => {
                  const status = getStatusBadge(sub.status);

                  return (
                    <tr key={sub.id} className="hover:bg-[var(--color-card-subtle)] transition">
                      <td className="p-2.5 max-w-[260px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                            {sub.courseCode}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] truncate">{sub.courseTitleTh}</span>
                        </div>
                        <p className="font-bold text-[var(--color-text-title)] line-clamp-1">{sub.assignmentTitle}</p>
                      </td>

                      <td className="p-2.5">
                        <p className="font-bold text-[var(--color-text-title)]">{sub.studentName}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{sub.studentRoom}</p>
                      </td>

                      <td className="p-2.5 text-center font-mono text-[var(--color-text-body)]">
                        <div className="text-amber-800 dark:text-amber-300 text-[11px] font-semibold">Due: {sub.dueDate}</div>
                        {sub.submittedAt ? (
                          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">ส่ง: {sub.submittedAt}</div>
                        ) : (
                          <div className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold mt-0.5">ยังไม่ได้ส่ง</div>
                        )}
                      </td>

                      <td className="p-2.5">
                        {sub.fileAttachment ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] max-w-[180px]">
                            <FileText className="w-3.5 h-3.5 text-[var(--color-primary-text)] shrink-0" />
                            <span className="truncate text-[10px]">{sub.fileAttachment.name}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)] text-[11px]">- ไม่มีไฟล์ -</span>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        {sub.score !== undefined ? (
                          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                            {sub.score} <span className="text-[10px] text-[var(--color-text-muted)]">/ {sub.maxScore}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)] text-xs">-- / {sub.maxScore}</span>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>

                      <td className="p-2.5 text-right">
                        {(() => {
                          const actionItems: TableActionItem[] = [
                            ...(canManageAssignments
                              ? [
                                  {
                                    id: 'grade',
                                    label: sub.status === 'graded' ? 'แก้ไขคะแนน & ความเห็น' : 'ตรวจงาน / ให้คะแนน',
                                    icon: <Award className="w-3.5 h-3.5" />,
                                    variant: 'warning' as const,
                                    onClick: () => {
                                      setSelectedSubForGrading(sub);
                                      setGradingScore(sub.score ?? 0);
                                      setGradingFeedback(sub.teacherFeedback ?? '');
                                      setGradeError(null);
                                    },
                                  },
                                ]
                              : []),
                            {
                              id: 'filter_student',
                              label: `กรองดูเฉพาะ ${sub.studentName}`,
                              icon: <Search className="w-3.5 h-3.5" />,
                              onClick: () => setSearchTerm(sub.studentName),
                            },
                            {
                              id: 'view_assignment_tab',
                              label: 'ดูรายการงานที่สั่งทั้งหมด',
                              icon: <BookOpen className="w-3.5 h-3.5" />,
                              onClick: () => setHwTab('assignments'),
                            },
                          ];
                          return (
                            <TableActionMenu
                              items={actionItems}
                              ariaLabel={`จัดการงานส่งของ ${sub.studentName}`}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  );
                }} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE ASSIGNMENTS LIST */}
      {hwTab === 'assignments' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <PagedList items={filteredAssignments} pageSize={3} renderItem={(asg) => (
              <div
                key={asg.id}
                className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">
                      {asg.courseCode || '—'}
                    </span>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono font-semibold">
                      กำหนดส่ง: {asg.dueDate}
                    </span>
                  </div>

                  <h4 className="font-bold text-[var(--color-text-title)] text-xs line-clamp-1">{asg.titleTh}</h4>
                  <p className="text-[11px] text-[var(--color-text-body)] line-clamp-2 mt-1">{asg.description}</p>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text-muted)]">
                    คะแนนเต็ม: <strong className="text-[var(--color-text-title)]">{asg.maxScore ?? asg.points}</strong> แต้ม
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    ส่งแล้ว: {submissions.filter(s => s.assignmentId === asg.id && s.status !== 'pending').length} คน
                  </span>
                </div>
              </div>
            )} />
          </div>
        </div>
      )}

      {/* TAB 3: PENDING HOMEWORK & SUMMARY */}
      {hwTab === 'pending' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">การบ้านทั้งหมด</span>
              <p className="text-lg font-bold text-[var(--color-text-title)] mt-1">{submissions.length} ชิ้นงาน</p>
            </div>
            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">ส่งแล้ว/ตรวจแล้ว</span>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length} รายการ
              </p>
            </div>
            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">ส่งล่าช้า (Late)</span>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">
                {submissions.filter(s => s.status === 'late').length} รายการ
              </p>
            </div>
            <div className="bg-[var(--color-card)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
              <span className="text-[11px] text-[var(--color-text-muted)]">ยังค้างส่ง (Pending)</span>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">
                {submissions.filter(s => s.status === 'pending').length} รายการ
              </p>
            </div>
          </div>

          {/* Pending Submissions Alert List */}
          <div className="bg-[var(--color-card)] p-3.5 rounded-xl border border-rose-400 dark:border-rose-700 shadow-xs">
            <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider pb-2 border-b border-[var(--color-border)] flex items-center gap-1.5 mb-2.5">
              <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-300" />
              <span>รายชื่อนักเรียนที่มีงานค้างส่ง (Pending Assignment Watchlist)</span>
            </h3>

            <div className="space-y-2">
              <PagedList items={filteredPendingSubmissions} pageSize={3} renderItem={(sub) => (
                <div
                  key={sub.id}
                  className="p-2.5 rounded-lg bg-[var(--color-card-subtle)] border border-rose-300 dark:border-rose-700 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-[var(--color-text-title)]">{sub.studentName}</span>
                    <span className="text-[var(--color-text-muted)] ml-2">({sub.studentRoom})</span>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      ค้างส่ง: {sub.assignmentTitle} ({sub.courseCode})
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700 font-mono">
                    Due: {sub.dueDate}
                  </span>
                </div>
              )} />
            </div>
          </div>
        </div>
      )}

      {/* Teacher Assignment Modal */}
      {showAssignmentModal && canManageAssignments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                {lang === 'th' ? 'สร้างและมอบหมายงาน' : 'Create Assignment'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignmentModal(false)}
                aria-label={lang === 'th' ? 'ปิดฟอร์ม' : 'Close form'}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  {lang === 'th' ? 'รายวิชา' : 'Course'}
                </label>
                <select
                  required
                  value={assignmentCourseId}
                  onChange={(e) => setAssignmentCourseId(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                >
                  <option value="">{lang === 'th' ? 'เลือกรายวิชา' : 'Select a course'}</option>
                  {teacherFilteredCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {lang === 'th' ? course.titleTh : course.titleEn}
                    </option>
                  ))}
                </select>
                {teacherFilteredCourses.length === 0 && (
                  <p className="mt-1 text-amber-800 dark:text-amber-300">
                    {lang === 'th' ? 'ไม่พบรายวิชาที่ครูสามารถมอบหมายงานได้' : 'No courses are available for assignment.'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                    {lang === 'th' ? 'ชื่องาน (ภาษาไทย)' : 'Assignment title'}
                  </label>
                  <input
                    required
                    value={assignmentTitleTh}
                    onChange={(e) => setAssignmentTitleTh(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                    {lang === 'th' ? 'ชื่องาน (ภาษาอังกฤษ)' : 'English title (optional)'}
                  </label>
                  <input
                    value={assignmentTitleEn}
                    onChange={(e) => setAssignmentTitleEn(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                    {lang === 'th' ? 'กำหนดส่ง' : 'Due date'}
                  </label>
                  <input
                    required
                    type="date"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                    {lang === 'th' ? 'คะแนนเต็ม' : 'Maximum score'}
                  </label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.5"
                    value={assignmentPoints}
                    onChange={(e) => setAssignmentPoints(e.target.value)}
                    className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  {lang === 'th' ? 'รายละเอียด / คำชี้แจง' : 'Instructions (optional)'}
                </label>
                <textarea
                  rows={3}
                  value={assignmentDescription}
                  onChange={(e) => setAssignmentDescription(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              {assignmentError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-rose-800 dark:text-rose-200">
                  {assignmentError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  disabled={isSavingAssignment}
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment || teacherFilteredCourses.length === 0}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold shadow-sm cursor-pointer"
                >
                  {isSavingAssignment
                    ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : (lang === 'th' ? 'บันทึกและมอบหมาย' : 'Save Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Grading Modal */}
      {selectedSubForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                {lang === 'th' ? 'ตรวจและให้คะแนนการบ้าน' : 'Grade Assignment'}
              </h3>
              <button onClick={() => setSelectedSubForGrading(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1 text-xs">
              <p className="font-bold text-[var(--color-text-title)]">{selectedSubForGrading.assignmentTitle}</p>
              <p className="text-[var(--color-text-body)]">
                นักเรียน: <strong className="text-[var(--color-primary-text)]">{selectedSubForGrading.studentName}</strong> ({selectedSubForGrading.studentRoom})
              </p>
              {selectedSubForGrading.textSubmission && (
                <p className="text-[11px] text-[var(--color-text-body)] bg-[var(--color-card)] border border-[var(--color-border)] p-2 rounded mt-2 italic">
                  "{selectedSubForGrading.textSubmission}"
                </p>
              )}
            </div>

            <form onSubmit={handleSaveGrading} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[var(--color-text-body)] font-semibold">{lang === 'th' ? 'คะแนนที่ได้' : 'Score'}</label>
                  <span className="font-mono text-amber-800 dark:text-amber-300 font-bold text-sm">
                    {gradingScore} / {selectedSubForGrading.maxScore}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={selectedSubForGrading.maxScore}
                  required
                  value={gradingScore}
                  onChange={(e) => setGradingScore(Number(e.target.value))}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'คำแนะนำ / Feedback จากครูผู้สอน' : 'Teacher Feedback'}</label>
                <textarea
                  rows={3}
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  placeholder="เขียนคำชี้แนะ จุดเด่น และสิ่งที่ควรปรับปรุง..."
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              {gradeError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-rose-800 dark:text-rose-200">
                  {gradeError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  disabled={isSavingGrade}
                  onClick={() => setSelectedSubForGrading(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingGrade}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold shadow-sm cursor-pointer"
                >
                  {isSavingGrade
                    ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : (lang === 'th' ? 'บันทึกคะแนนและคำแนะนำ' : 'Save Grade')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {showSubmitModal && canStudentSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                {lang === 'th' ? 'ส่งการบ้านออนไลน์' : 'Submit Homework'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                aria-label={lang === 'th' ? 'ปิดฟอร์ม' : 'Close form'}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitHomework} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  {lang === 'th' ? 'งานที่ต้องการส่ง' : 'Assignment'}
                </label>
                <select
                  required
                  value={submitAssignmentId}
                  onChange={(e) => setSubmitAssignmentId(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                >
                  <option value="">{lang === 'th' ? 'เลือกงานที่มอบหมาย' : 'Select an assignment'}</option>
                  {activeAssignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.courseCode ? `${assignment.courseCode} — ` : ''}{assignment.titleTh}
                    </option>
                  ))}
                </select>
                {activeAssignments.length === 0 && (
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    {lang === 'th' ? 'ยังไม่มีงานที่เปิดรับส่ง' : 'There are no open assignments.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">
                  {lang === 'th' ? 'ข้อความถึงอาจารย์ (ไม่บังคับ)' : 'Note to teacher (optional)'}
                </label>
                <textarea
                  rows={3}
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              {submitDupReasons.length > 0 && (
                <div className="p-2.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                    <span>{submitDupReasons.join(', ')}</span>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDuplicateConfirm}
                      onChange={(e) => setAllowDuplicateConfirm(e.target.checked)}
                      className="rounded accent-amber-600"
                    />
                    <span>{lang === 'th' ? 'ยืนยันว่าต้องการส่งงานนี้อีกครั้ง' : 'Confirm another submission'}</span>
                  </label>
                </div>
              )}

              {submitError && (
                <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-rose-800 dark:text-rose-200">
                  {submitError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  disabled={isSubmittingHomework}
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!canStudentSubmit || isSubmittingHomework || activeAssignments.length === 0 || (submitDupReasons.length > 0 && !allowDuplicateConfirm)}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold shadow-sm cursor-pointer"
                >
                  {isSubmittingHomework
                    ? (lang === 'th' ? 'กำลังส่ง...' : 'Submitting...')
                    : (lang === 'th' ? 'ยืนยันการส่งการบ้าน' : 'Submit Now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoogleCalendarModal && (
        <GoogleCalendarSyncModal
          slots={[]}
          assignments={assignments}
          courses={courses}
          schoolId={schoolId}
          schoolName={schoolName}
          academicYear="2569"
          semester="1"
          filterLabel={lang === 'th' ? 'กำหนดส่งการบ้านและงานที่มอบหมาย' : 'Assignments & Homework Deadlines'}
          defaultStartDate={calendarWeekStart}
          defaultEndDate={addCalendarDays(calendarWeekStart, 90)}
          calendarWeekStart={calendarWeekStart}
          onClose={() => setShowGoogleCalendarModal(false)}
        />
      )}
    </div>
  );
};
