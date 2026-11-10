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
  Layers
} from 'lucide-react';
import { 
  HomeworkSubmission, 
  Student, 
  Course, 
  AppLanguage, 
  UserRole,
  Assignment
} from '../types';
import { INITIAL_ASSIGNMENTS } from '../data/mockData';
import { PagedList } from './PagedList';

const PaginatedTableRows = <T,>({
  items,
  colSpan,
  renderRow,
  pageSize = 8
}: {
  items: readonly T[];
  colSpan: number;
  renderRow: (item: T) => React.ReactNode;
  pageSize?: number;
}) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <>
      {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(renderRow)}
      {pageCount > 1 && (
        <tr>
          <td colSpan={colSpan} className="p-2">
            <div className="flex items-center justify-between">
              <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ก่อนหน้า</button>
              <span className="text-[11px] text-[var(--color-text-muted)]">{currentPage + 1} / {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="px-3 py-1 rounded border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] disabled:opacity-40 cursor-pointer">ถัดไป</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface HomeworkTrackerViewProps {
  submissions: HomeworkSubmission[];
  students: Student[];
  courses: Course[];
  assignments?: Assignment[];
  onAddSubmission: (sub: HomeworkSubmission) => void;
  onGradeSubmission: (id: string, score: number, feedback: string) => void;
  lang: AppLanguage;
  currentRole: UserRole;
}

export const HomeworkTrackerView: React.FC<HomeworkTrackerViewProps> = ({
  submissions,
  students,
  courses,
  assignments = INITIAL_ASSIGNMENTS,
  onAddSubmission,
  onGradeSubmission,
  lang,
  currentRole
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'late' | 'pending' | 'graded'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [hwTab, setHwTab] = useState<'submissions' | 'assignments' | 'pending'>('submissions');
  
  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSubForGrading, setSelectedSubForGrading] = useState<HomeworkSubmission | null>(null);

  // Submit modal form
  const [submitStudentId, setSubmitStudentId] = useState<string>(students[0]?.id || '');
  const [submitAssignmentId, setSubmitAssignmentId] = useState<string>('asg-2');
  const [submitTitle, setSubmitTitle] = useState('โครงงานวิเคราะห์อนุพันธ์และอินทิกรัลในชีวิตประจำวัน');
  const [submitCourseCode, setSubmitCourseCode] = useState('MA201');
  const [submitText, setSubmitText] = useState('');
  const [submitFileName, setSubmitFileName] = useState('My_Calculus_Project.pdf');

  // Grading form
  const [gradingScore, setGradingScore] = useState<number>(18);
  const [gradingFeedback, setGradingFeedback] = useState('ทำได้ดีมากครับ ครบถ้วนตามตัวชี้วัด');

  const filteredSubmissions = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = s.assignmentTitle.toLowerCase().includes(q) ||
      s.studentName.toLowerCase().includes(q) ||
      s.courseCode.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchCourse = courseFilter === 'all' || s.courseCode === courseFilter;
    return matchSearch && matchStatus && matchCourse;
  });

  const handleSubmitHomework = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === submitStudentId);
    if (!student) return;

    const newSub: HomeworkSubmission = {
      id: `sub-${Date.now()}`,
      schoolId: student.schoolId,
      assignmentId: submitAssignmentId,
      assignmentTitle: submitTitle,
      courseCode: submitCourseCode,
      courseTitleTh: 'คณิตศาสตร์เพิ่มเติม (แคลคูลัส)',
      studentId: student.id,
      studentName: `${student.firstNameTh} ${student.lastNameTh}`,
      studentRoom: student.room,
      dueDate: '2026-11-15',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'submitted',
      fileAttachment: {
        name: submitFileName || 'Submission_File.pdf',
        size: '3.2 MB',
        type: 'PDF Document'
      },
      textSubmission: submitText || 'ส่งงานการบ้านเรียบร้อยแล้วครับ',
      maxScore: 30
    };

    onAddSubmission(newSub);
    setShowSubmitModal(false);
    setSubmitText('');
  };

  const handleSaveGrading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForGrading) return;
    onGradeSubmission(selectedSubForGrading.id, gradingScore, gradingFeedback);
    setSelectedSubForGrading(null);
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
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--color-card)] p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
            <FileCheck2 className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2 flex-wrap">
              {lang === 'th' ? 'ระบบการบ้านและติดตามการส่งงานออนไลน์' : 'Homework & Assignment Submission Tracker'}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                Online LMS Hub
              </span>
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {lang === 'th'
                ? 'ส่งไฟล์การบ้าน ตรวจให้คะแนนพร้อม Rubric และติดตามสถานะงานค้างส่งสำหรับผู้ปกครอง'
                : 'Digital homework submission, grading with teacher feedback, and pending tasks tracker.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subtabs Navigation */}
          <div className="flex p-1 bg-[var(--color-card-subtle)] rounded-xl border border-[var(--color-border)]">
            <button
              onClick={() => setHwTab('submissions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                hwTab === 'submissions' ? 'bg-amber-400 text-slate-950 font-bold shadow-sm' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              1. รายการส่งงาน ({submissions.length})
            </button>
            <button
              onClick={() => setHwTab('assignments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                hwTab === 'assignments' ? 'bg-amber-400 text-slate-950 font-bold shadow-sm' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              2. การบ้านที่สั่ง ({assignments.length})
            </button>
            <button
              onClick={() => setHwTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                hwTab === 'pending' ? 'bg-amber-400 text-slate-950 font-bold shadow-sm' : 'text-[var(--color-text-body)] hover:bg-[var(--color-card)]'
              }`}
            >
              3. งานค้างส่ง ({submissions.filter(s => s.status === 'pending').length})
            </button>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{lang === 'th' ? 'ส่งการบ้านใหม่' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMISSIONS LIST */}
      {hwTab === 'submissions' && (
        <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-xs flex flex-col overflow-hidden">
          <div className="shrink-0 p-3 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              <h3 className="text-xs font-bold text-[var(--color-text-title)] uppercase tracking-wider">
                {lang === 'th' ? 'รายการส่งการบ้านรายบุคคล' : 'Homework Submissions List'}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาวิชา / ชื่อนักเรียน...' : 'Search tasks...'}
                  className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs pl-7 pr-2.5 py-1 rounded-lg border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[var(--color-card-subtle)] text-[var(--color-text-title)] text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)]"
              >
                <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
                <option value="graded">{lang === 'th' ? 'ตรวจแล้ว' : 'Graded'}</option>
                <option value="submitted">{lang === 'th' ? 'ส่งแล้ว (รอตรวจ)' : 'Submitted'}</option>
                <option value="late">{lang === 'th' ? 'ส่งล่าช้า' : 'Late'}</option>
                <option value="pending">{lang === 'th' ? 'ยังไม่ส่ง' : 'Pending'}</option>
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[11px] text-[var(--color-text-title)] uppercase">
                  <th className="p-2.5">{lang === 'th' ? 'หัวข้อการบ้าน / วิชา' : 'Assignment & Course'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'กำหนดส่ง / ส่งเมื่อ' : 'Due / Submitted'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'ไฟล์งานที่แนบ' : 'Attached File'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'คะแนน' : 'Score'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                  <th className="p-2.5 text-right">{lang === 'th' ? 'จัดการ' : 'Action'}</th>
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
                        {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin') ? (
                          <button
                            onClick={() => {
                              setSelectedSubForGrading(sub);
                              setGradingScore(sub.score ?? 18);
                              setGradingFeedback(sub.teacherFeedback ?? 'ผลงานดีมาก มีความตั้งใจ');
                            }}
                            className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 hover:bg-amber-400 hover:text-slate-950 border border-amber-300 dark:border-amber-700 text-[10px] font-bold transition cursor-pointer"
                          >
                            {sub.status === 'graded' ? 'แก้ไขคะแนน' : 'ตรวจงาน'}
                          </button>
                        ) : (
                          <span className="text-[var(--color-text-muted)] text-[10px]">ดูรายละเอียด</span>
                        )}
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
          <PagedList items={assignments} pageSize={3} renderItem={(asg) => (
              <div
                key={asg.id}
                className="p-3.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-mono text-[10px] font-bold">
                      {asg.courseCode || 'GEN-101'}
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
                    คะแนนเต็ม: <strong className="text-[var(--color-text-title)]">{asg.maxScore ?? asg.points ?? 20}</strong> แต้ม
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
              <PagedList items={submissions.filter(s => s.status === 'pending')} pageSize={3} renderItem={(sub) => (
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

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedSubForGrading(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-sm cursor-pointer"
                >
                  {lang === 'th' ? 'บันทึกคะแนนและคำแนะนำ' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                {lang === 'th' ? 'ส่งการบ้านออนไลน์' : 'Submit Homework'}
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] px-2 py-1 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitHomework} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียนผู้ส่ง' : 'Student'}</label>
                <select
                  value={submitStudentId}
                  onChange={(e) => setSubmitStudentId(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.room})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'การบ้านที่ต้องการส่ง' : 'Assignment'}</label>
                <input
                  type="text"
                  required
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'ชื่อไฟล์ที่แนบ' : 'Attached File Name'}</label>
                <input
                  type="text"
                  required
                  value={submitFileName}
                  onChange={(e) => setSubmitFileName(e.target.value)}
                  placeholder="เช่น Report_Assignment.pdf"
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] mb-1 font-semibold">{lang === 'th' ? 'คำอธิบายหรือข้อความถึงอาจารย์' : 'Notes / Submission Text'}</label>
                <textarea
                  rows={2}
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  placeholder="ระบุข้อความหรือลิงก์ส่งงานเพิ่มเติม..."
                  className="w-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text-title)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-sm cursor-pointer"
                >
                  {lang === 'th' ? 'ยืนยันการส่งการบ้าน' : 'Submit Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
