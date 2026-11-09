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
        return { label: 'ตรวจและให้คะแนนแล้ว', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'submitted':
        return { label: 'ส่งตรงเวลา (รอตรวจ)', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
      case 'late':
        return { label: 'ส่งช้ากว่ากำหนด', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'pending':
        return { label: 'ยังไม่ส่ง (ค้างส่ง)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3.5 sm:p-4 rounded-xl border border-slate-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <FileCheck2 className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {lang === 'th' ? 'ระบบการบ้านและติดตามการส่งงานออนไลน์' : 'Homework & Assignment Submission Tracker'}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Online LMS Hub
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {lang === 'th'
                ? 'ส่งไฟล์การบ้าน ตรวจให้คะแนนพร้อม Rubric และติดตามสถานะงานค้างส่งสำหรับผู้ปกครอง'
                : 'Digital homework submission, grading with teacher feedback, and pending tasks tracker.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subtabs Navigation */}
          <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              onClick={() => setHwTab('submissions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                hwTab === 'submissions' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. รายการส่งงาน ({submissions.length})
            </button>
            <button
              onClick={() => setHwTab('assignments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                hwTab === 'assignments' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. การบ้านที่สั่ง ({assignments.length})
            </button>
            <button
              onClick={() => setHwTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                hwTab === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. งานค้างส่ง ({submissions.filter(s => s.status === 'pending').length})
            </button>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md shadow-amber-600/30 transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{lang === 'th' ? 'ส่งการบ้านใหม่' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMISSIONS LIST */}
      {hwTab === 'submissions' && (
        <div className="flex-1 min-h-0 bg-slate-900/80 rounded-xl border border-slate-800 shadow-md flex flex-col overflow-hidden">
          <div className="shrink-0 p-3 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'th' ? 'รายการส่งการบ้านรายบุคคล' : 'Homework Submissions List'}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาวิชา / ชื่อนักเรียน...' : 'Search tasks...'}
                  className="bg-slate-800 text-white text-xs pl-7 pr-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700"
              >
                <option value="all">{lang === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
                <option value="graded">{lang === 'th' ? 'ตรวจแล้ว' : 'Graded'}</option>
                <option value="submitted">{lang === 'th' ? 'ส่งแล้ว (รอตรวจ)' : 'Submitted'}</option>
                <option value="late">{lang === 'th' ? 'ส่งล่าช้า' : 'Late'}</option>
                <option value="pending">{lang === 'th' ? 'ยังไม่ส่ง' : 'Pending'}</option>
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xs text-[11px] text-slate-400 uppercase">
                  <th className="p-2.5">{lang === 'th' ? 'หัวข้อการบ้าน / วิชา' : 'Assignment & Course'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'นักเรียน' : 'Student'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'กำหนดส่ง / ส่งเมื่อ' : 'Due / Submitted'}</th>
                  <th className="p-2.5">{lang === 'th' ? 'ไฟล์งานที่แนบ' : 'Attached File'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'คะแนน' : 'Score'}</th>
                  <th className="p-2.5 text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                  <th className="p-2.5 text-right">{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubmissions.map((sub) => {
                  const status = getStatusBadge(sub.status);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-2.5 max-w-[260px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {sub.courseCode}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">{sub.courseTitleTh}</span>
                        </div>
                        <p className="font-bold text-white line-clamp-1">{sub.assignmentTitle}</p>
                      </td>

                      <td className="p-2.5">
                        <p className="font-bold text-white">{sub.studentName}</p>
                        <p className="text-[10px] text-slate-400">{sub.studentRoom}</p>
                      </td>

                      <td className="p-2.5 text-center font-mono text-slate-300">
                        <div className="text-amber-400 text-[11px]">Due: {sub.dueDate}</div>
                        {sub.submittedAt ? (
                          <div className="text-[10px] text-slate-400 mt-0.5">ส่ง: {sub.submittedAt}</div>
                        ) : (
                          <div className="text-[10px] text-rose-400 mt-0.5">ยังไม่ได้ส่ง</div>
                        )}
                      </td>

                      <td className="p-2.5">
                        {sub.fileAttachment ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 max-w-[180px]">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate text-[10px]">{sub.fileAttachment.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">- ไม่มีไฟล์ -</span>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        {sub.score !== undefined ? (
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            {sub.score} <span className="text-[10px] text-slate-400">/ {sub.maxScore}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-- / {sub.maxScore}</span>
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
                            className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-[10px] font-semibold transition cursor-pointer"
                          >
                            {sub.status === 'graded' ? 'แก้ไขคะแนน' : 'ตรวจงาน'}
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">ดูรายละเอียด</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE ASSIGNMENTS LIST */}
      {hwTab === 'assignments' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((asg) => (
              <div
                key={asg.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                      {asg.courseCode || 'GEN-101'}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      กำหนดส่ง: {asg.dueDate}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs line-clamp-1">{asg.titleTh}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{asg.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    คะแนนเต็ม: <strong className="text-white">{asg.maxScore ?? asg.points ?? 20}</strong> แต้ม
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    ส่งแล้ว: {submissions.filter(s => s.assignmentId === asg.id && s.status !== 'pending').length} คน
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PENDING HOMEWORK & SUMMARY */}
      {hwTab === 'pending' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-400">การบ้านทั้งหมด</span>
              <p className="text-lg font-bold text-white mt-1">{submissions.length} ชิ้นงาน</p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-400">ส่งแล้ว/ตรวจแล้ว</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length} รายการ
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-400">ส่งล่าช้า (Late)</span>
              <p className="text-lg font-bold text-amber-400 mt-1">
                {submissions.filter(s => s.status === 'late').length} รายการ
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-xs">
              <span className="text-[11px] text-slate-400">ยังค้างส่ง (Pending)</span>
              <p className="text-lg font-bold text-rose-400 mt-1">
                {submissions.filter(s => s.status === 'pending').length} รายการ
              </p>
            </div>
          </div>

          {/* Pending Submissions Alert List */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-rose-500/30 shadow-md">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center gap-1.5 mb-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>รายชื่อนักเรียนที่มีงานค้างส่ง (Pending Assignment Watchlist)</span>
            </h3>

            <div className="space-y-2">
              {submissions.filter(s => s.status === 'pending').map((sub) => (
                <div
                  key={sub.id}
                  className="p-2.5 rounded-lg bg-slate-800/50 border border-rose-500/20 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white">{sub.studentName}</span>
                    <span className="text-slate-400 ml-2">({sub.studentRoom})</span>
                    <p className="text-[11px] text-rose-300 mt-0.5">
                      ค้างส่ง: {sub.assignmentTitle} ({sub.courseCode})
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                    Due: {sub.dueDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Grading Modal */}
      {selectedSubForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                {lang === 'th' ? 'ตรวจและให้คะแนนการบ้าน' : 'Grade Assignment'}
              </h3>
              <button onClick={() => setSelectedSubForGrading(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1 text-xs">
              <p className="font-bold text-white">{selectedSubForGrading.assignmentTitle}</p>
              <p className="text-slate-400">
                นักเรียน: <strong className="text-indigo-300">{selectedSubForGrading.studentName}</strong> ({selectedSubForGrading.studentRoom})
              </p>
              {selectedSubForGrading.textSubmission && (
                <p className="text-[11px] text-slate-300 bg-black/20 p-2 rounded mt-2 italic">
                  "{selectedSubForGrading.textSubmission}"
                </p>
              )}
            </div>

            <form onSubmit={handleSaveGrading} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-400 font-semibold">{lang === 'th' ? 'คะแนนที่ได้' : 'Score'}</label>
                  <span className="font-mono text-amber-400 font-bold text-sm">
                    {gradingScore} / {selectedSubForGrading.maxScore}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={selectedSubForGrading.maxScore}
                  value={gradingScore}
                  onChange={(e) => setGradingScore(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'คำแนะนำ / Feedback จากครูผู้สอน' : 'Teacher Feedback'}</label>
                <textarea
                  rows={3}
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  placeholder="เขียนคำชี้แนะ จุดเด่น และสิ่งที่ควรปรับปรุง..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSubForGrading(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/30"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-amber-400" />
                {lang === 'th' ? 'ส่งการบ้านออนไลน์' : 'Submit Homework'}
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitHomework} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'เลือกนักเรียนผู้ส่ง' : 'Student'}</label>
                <select
                  value={submitStudentId}
                  onChange={(e) => setSubmitStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstNameTh} {s.lastNameTh} ({s.room})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'การบ้านที่ต้องการส่ง' : 'Assignment'}</label>
                <input
                  type="text"
                  required
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'ชื่อไฟล์ที่แนบ' : 'Attached File Name'}</label>
                <input
                  type="text"
                  required
                  value={submitFileName}
                  onChange={(e) => setSubmitFileName(e.target.value)}
                  placeholder="เช่น Report_Assignment.pdf"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">{lang === 'th' ? 'คำอธิบายหรือข้อความถึงอาจารย์' : 'Notes / Submission Text'}</label>
                <textarea
                  rows={2}
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  placeholder="ระบุข้อความหรือลิงก์ส่งงานเพิ่มเติม..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/30"
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
