import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Paperclip,
  Plus,
  Send,
} from 'lucide-react';
import type {
  AppLanguage,
  Assignment,
  Course,
  HomeworkSubmission,
  School,
  Student,
  UserRole,
} from '../../types';
import { getBangkokDateInputValue } from '../../lib/timetableCalendar';
import { PagedList } from '../../components/PagedList';
import { TableActionMenu } from '../../components/common/TableActionMenu';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BaseModal } from '../../components/common/BaseModal';
import { MobileSubPageHeader } from './MobileHeaderAndNav';

interface MobileHomeworkTabProps {
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  scopedAssignments: Assignment[];
  scopedCourses: Course[];
  homeworkSubmissions: HomeworkSubmission[];
  ownStudent?: Student;
  myCompletedSubmissions: Set<string>;
  currentPersonId: string | undefined;
  canManageHomework: boolean;
  canStudentSubmit: boolean;
  onAddHomeworkAssignment?: (assignment: Assignment) => Promise<void>;
  onAddHomeworkSubmission?: (sub: HomeworkSubmission) => Promise<void>;
  onGradeHomeworkSubmission?: (id: string, score: number, feedback: string) => Promise<void>;
  onSubmitAssignment?: (assignmentId: string) => Promise<void>;
  onBackHome: () => void;
}

export const MobileHomeworkTab: React.FC<MobileHomeworkTabProps> = ({
  activeSchool,
  currentRole,
  lang,
  scopedAssignments,
  scopedCourses,
  homeworkSubmissions,
  ownStudent,
  myCompletedSubmissions,
  currentPersonId,
  canManageHomework,
  canStudentSubmit,
  onAddHomeworkAssignment,
  onAddHomeworkSubmission,
  onGradeHomeworkSubmission,
  onSubmitAssignment,
  onBackHome,
}) => {
  const isStaff = ['teacher', 'admin', 'super_admin'].includes(currentRole);
  const [teacherSection, setTeacherSection] = useState<'assignments' | 'submissions' | 'create'>('assignments');
  const [studentFilter, setStudentFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'pending_grade' | 'graded'>('pending_grade');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // Student submit drawer state
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFileMeta, setSubmitFileMeta] = useState<{ name: string; size: string; type: string } | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Expanded assignment for reading instructions
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);

  // Teacher create assignment state
  const [newCourseId, setNewCourseId] = useState<string>(scopedCourses[0]?.id || '');
  const [newTitleTh, setNewTitleTh] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState(getBangkokDateInputValue());
  const [newPoints, setNewPoints] = useState('10');
  const [createBusy, setCreateBusy] = useState(false);

  // Teacher grading inline state
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeScoreInput, setGradeScoreInput] = useState<string>('');
  const [gradeFeedbackInput, setGradeFeedbackInput] = useState<string>('');
  const [gradeBusy, setGradeBusy] = useState(false);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedbackMsg({ type, text });
    window.setTimeout(() => setFeedbackMsg(null), 3200);
  };

  // Submission lookup for current student
  const studentSubmissionMap = useMemo(() => {
    const map = new Map<string, HomeworkSubmission>();
    homeworkSubmissions.forEach((sub) => {
      if (currentPersonId && sub.studentId === currentPersonId) {
        const prev = map.get(sub.assignmentId);
        if (!prev || (sub.submittedAt || '') > (prev.submittedAt || '')) {
          map.set(sub.assignmentId, sub);
        }
      }
    });
    return map;
  }, [homeworkSubmissions, currentPersonId]);

  const filteredStudentAssignments = useMemo(() => {
    return scopedAssignments.filter((asg) => {
      if (selectedCourseFilter !== 'all' && asg.courseId !== selectedCourseFilter) return false;
      const sub = studentSubmissionMap.get(asg.id);
      const isDone =
        Boolean(sub && sub.status !== 'pending') ||
        myCompletedSubmissions.has(asg.id) ||
        Boolean(currentPersonId && asg.submittedStudentIds?.includes(currentPersonId));
      if (studentFilter === 'pending') return !isDone;
      if (studentFilter === 'done') return isDone;
      return true;
    });
  }, [scopedAssignments, selectedCourseFilter, studentSubmissionMap, myCompletedSubmissions, currentPersonId, studentFilter]);

  const teacherFilteredAssignments = useMemo(() => {
    return scopedAssignments.filter((asg) =>
      selectedCourseFilter === 'all' ? true : asg.courseId === selectedCourseFilter
    );
  }, [scopedAssignments, selectedCourseFilter]);

  const teacherFilteredSubmissions = useMemo(() => {
    return homeworkSubmissions.filter((sub) => {
      if (selectedCourseFilter !== 'all') {
        const course = scopedCourses.find((c) => c.id === selectedCourseFilter);
        if (course && sub.courseCode !== course.code) return false;
      }
      if (submissionFilter === 'pending_grade') {
        return sub.status === 'submitted' || sub.status === 'late';
      }
      if (submissionFilter === 'graded') {
        return sub.status === 'graded';
      }
      return true;
    });
  }, [homeworkSubmissions, scopedCourses, selectedCourseFilter, submissionFilter]);

  const pendingToGradeCount = homeworkSubmissions.filter(
    (s) => s.status === 'submitted' || s.status === 'late'
  ).length;

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    if (!submitText.trim() && !submitFileMeta) {
      showToast('err', lang === 'th' ? 'กรุณาพิมพ์คำตอบหรือแนบไฟล์งาน' : 'Enter an answer or attach a file.');
      return;
    }
    setSubmitBusy(true);
    try {
      const course = scopedCourses.find((c) => c.id === submittingAssignment.courseId);
      const targetStudentId = ownStudent?.id || currentPersonId || '';
      if (onAddHomeworkSubmission && targetStudentId) {
        await onAddHomeworkSubmission({
          id: `submission-${crypto.randomUUID()}`,
          schoolId: activeSchool.id,
          assignmentId: submittingAssignment.id,
          assignmentTitle: submittingAssignment.titleTh,
          courseCode: submittingAssignment.courseCode || course?.code || '',
          courseTitleTh: course?.titleTh || '',
          studentId: targetStudentId,
          studentName: ownStudent ? `${ownStudent.firstNameTh} ${ownStudent.lastNameTh}`.trim() : 'นักเรียน',
          studentRoom: ownStudent ? `${ownStudent.gradeLevel} ${ownStudent.room}`.trim() : '',
          dueDate: submittingAssignment.dueDate,
          submittedAt: new Date().toISOString(),
          status: getBangkokDateInputValue() <= submittingAssignment.dueDate ? 'submitted' : 'late',
          textSubmission: submitText.trim() || undefined,
          fileAttachment: submitFileMeta || undefined,
          maxScore: submittingAssignment.maxScore ?? submittingAssignment.points,
        });
      } else if (onSubmitAssignment) {
        await onSubmitAssignment(submittingAssignment.id);
      }
      setSubmittingAssignment(null);
      setSubmitText('');
      setSubmitFileMeta(null);
      showToast('ok', lang === 'th' ? 'ส่งการบ้านเรียบร้อยแล้ว' : 'Homework submitted.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleTeacherCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const course = scopedCourses.find((c) => c.id === (newCourseId || scopedCourses[0]?.id));
    const pts = Number(newPoints);
    if (!course) {
      showToast('err', lang === 'th' ? 'กรุณาเลือกรายวิชา' : 'Select a course');
      return;
    }
    if (!newTitleTh.trim() || !newDueDate || !Number.isFinite(pts) || pts <= 0) {
      showToast('err', lang === 'th' ? 'กรุณากรอกชื่องาน วันกำหนดส่ง และคะแนนให้ถูกต้อง' : 'Fill title, due date and points');
      return;
    }
    if (!onAddHomeworkAssignment) return;
    setCreateBusy(true);
    try {
      await onAddHomeworkAssignment({
        id: `assignment-${crypto.randomUUID()}`,
        schoolId: activeSchool.id,
        courseId: course.id,
        courseCode: course.code,
        titleTh: newTitleTh.trim(),
        titleEn: newTitleTh.trim(),
        description: newDescription.trim(),
        dueDate: newDueDate,
        points: pts,
        maxScore: pts,
        submittedStudentIds: [],
        status: 'active',
      });
      setNewTitleTh('');
      setNewDescription('');
      setNewPoints('10');
      setTeacherSection('assignments');
      showToast('ok', lang === 'th' ? 'สั่งการบ้านเรียบร้อยแล้ว' : 'Assignment created.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : String(err));
    } finally {
      setCreateBusy(false);
    }
  };

  const handleSaveSubmissionGrade = async (sub: HomeworkSubmission) => {
    if (!onGradeHomeworkSubmission) return;
    const scoreNum = Number(gradeScoreInput);
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > sub.maxScore) {
      showToast('err', lang === 'th' ? `คะแนนต้องอยู่ระหว่าง 0–${sub.maxScore}` : `Score must be 0–${sub.maxScore}`);
      return;
    }
    setGradeBusy(true);
    try {
      await onGradeHomeworkSubmission(sub.id, scoreNum, gradeFeedbackInput.trim());
      setGradingSubId(null);
      setGradeScoreInput('');
      setGradeFeedbackInput('');
      showToast('ok', lang === 'th' ? `ตรวจงาน ${sub.studentName} แล้ว (${scoreNum}/${sub.maxScore})` : 'Graded.');
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : String(err));
    } finally {
      setGradeBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      <MobileSubPageHeader
        title={
          isStaff
            ? lang === 'th'
              ? 'การบ้าน & ตรวจงานนักเรียน'
              : 'Homework Manager'
            : lang === 'th'
              ? 'การบ้านของฉัน'
              : 'My Homework'
        }
        iconTab="homework"
        backLabel={lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}
        onBack={onBackHome}
      />

      {feedbackMsg && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            feedbackMsg.type === 'ok'
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100'
              : 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100'
          }`}
        >
          {feedbackMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Teacher Mode Segmented Controls */}
      {isStaff ? (
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setTeacherSection('assignments')}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap truncate ${
              teacherSection === 'assignments'
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            งานที่สั่ง ({scopedAssignments.length})
          </button>
          <button
            type="button"
            onClick={() => setTeacherSection('submissions')}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap truncate ${
              teacherSection === 'submissions'
                ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            ตรวจงาน ({pendingToGradeCount})
          </button>
          {canManageHomework && onAddHomeworkAssignment && (
            <button
              type="button"
              onClick={() => setTeacherSection('create')}
              className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1 ${
                teacherSection === 'create'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--color-primary-text)]'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>สั่งงาน</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
          {(
            [
              { id: 'all', label: `ทั้งหมด (${scopedAssignments.length})` },
              {
                id: 'pending',
                label: `รอส่ง (${scopedAssignments.filter((a) => !studentSubmissionMap.has(a.id) && !myCompletedSubmissions.has(a.id) && !(currentPersonId && a.submittedStudentIds?.includes(currentPersonId))).length})`,
              },
              { id: 'done', label: 'ส่งแล้ว' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStudentFilter(f.id)}
              className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap truncate ${
                studentFilter === f.id
                  ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Course Filter */}
      {(!isStaff || teacherSection !== 'create') && scopedCourses.length > 1 && (
        <select
          aria-label={lang === 'th' ? 'กรองตามรายวิชา' : 'Filter by course'}
          value={selectedCourseFilter}
          onChange={(e) => setSelectedCourseFilter(e.target.value)}
          className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)]"
        >
          <option value="all">{lang === 'th' ? 'ทุกรายวิชา' : 'All Courses'}</option>
          {scopedCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {lang === 'th' ? c.titleTh : c.titleEn}
            </option>
          ))}
        </select>
      )}

      {/* TEACHER: CREATE ASSIGNMENT */}
      {isStaff && teacherSection === 'create' && canManageHomework && (
        <form
          onSubmit={handleTeacherCreateAssignment}
          className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3"
        >
          <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--color-primary-text)]" />
            <span>สั่งการบ้าน / ภาระงานใหม่</span>
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">รายวิชา</label>
            <select
              value={newCourseId || scopedCourses[0]?.id || ''}
              onChange={(e) => setNewCourseId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)]"
            >
              {scopedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.titleTh}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">หัวข้อการบ้าน</label>
            <input
              type="text"
              value={newTitleTh}
              onChange={(e) => setNewTitleTh(e.target.value)}
              placeholder="เช่น แบบฝึกหัดบทที่ 3 ข้อ 1-10"
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">คำสั่ง / รายละเอียด</label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="อธิบายวิธีทำหรือลิงก์ใบงาน..."
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">กำหนดส่ง</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">คะแนนเต็ม</label>
              <input
                type="number"
                min={1}
                max={100}
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-mono font-bold text-[var(--color-text-title)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createBusy}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{createBusy ? 'กำลังบันทึก...' : 'ประกาศสั่งการบ้าน'}</span>
          </button>
        </form>
      )}

      {/* TEACHER: SUBMISSIONS & GRADING */}
      {isStaff && teacherSection === 'submissions' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'pending_grade', label: `รอตรวจ (${pendingToGradeCount})` },
                { id: 'graded', label: 'ตรวจแล้ว' },
                { id: 'all', label: `ทั้งหมด (${homeworkSubmissions.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubmissionFilter(tab.id)}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                  submissionFilter === tab.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <PagedList
            items={teacherFilteredSubmissions}
            pageSize={4}
            previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
            nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
            emptyState={
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                ไม่มีรายการงานส่งในหมวดนี้
              </div>
            }
            renderItem={(sub) => {
              const isGrading = gradingSubId === sub.id;
              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {sub.courseCode} · {sub.assignmentTitle}
                      </p>
                      <h4 className="text-sm font-bold text-[var(--color-text-title)] truncate">
                        {sub.studentName}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        {sub.studentRoom} {sub.submittedAt ? `· ส่ง ${sub.submittedAt.slice(0, 10)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge
                        size="xs"
                        status={
                          sub.status === 'graded'
                            ? 'complete'
                            : sub.status === 'late'
                              ? 'delayed'
                              : sub.status === 'pending'
                                ? 'neutral'
                                : 'pending'
                        }
                        label={
                          sub.status === 'graded'
                            ? `${sub.score ?? 0}/${sub.maxScore} คะแนน`
                            : sub.status === 'late'
                              ? 'ส่งช้า'
                              : sub.status === 'pending'
                                ? 'ยังไม่ส่ง'
                                : 'รอตรวจ'
                        }
                      />
                      {canManageHomework &&
                        onGradeHomeworkSubmission &&
                        sub.status !== 'pending' &&
                        !isGrading && (
                          <TableActionMenu
                            ariaLabel={`เมนูจัดการงานส่งของ ${sub.studentName}`}
                            triggerClassName="min-h-10 min-w-10 justify-center shrink-0"
                            items={[
                              {
                                id: 'grade-submission',
                                label: sub.status === 'graded' ? 'แก้ไขคะแนน / ความเห็น' : 'ตรวจและให้คะแนน',
                                icon: <FileCheck2 className="w-4 h-4" />,
                                onClick: () => {
                                  setGradingSubId(sub.id);
                                  setGradeScoreInput(String(sub.score ?? sub.maxScore));
                                  setGradeFeedbackInput(sub.teacherFeedback || '');
                                },
                                variant: 'primary',
                              },
                            ]}
                          />
                        )}
                    </div>
                  </div>

                  {sub.textSubmission && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-body)] whitespace-pre-wrap">
                      {sub.textSubmission}
                    </div>
                  )}
                  {sub.fileAttachment && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-primary-text)] font-medium">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {sub.fileAttachment.name} ({sub.fileAttachment.size})
                      </span>
                    </div>
                  )}

                  {sub.teacherFeedback && !isGrading && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      ความเห็นครู: {sub.teacherFeedback}
                    </p>
                  )}

                  {canManageHomework && onGradeHomeworkSubmission && sub.status !== 'pending' && (
                    isGrading ? (
                      <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                              คะแนน (เต็ม {sub.maxScore})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={sub.maxScore}
                              value={gradeScoreInput}
                              onChange={(e) => setGradeScoreInput(e.target.value)}
                              className="w-full min-h-[40px] mt-0.5 px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono font-bold text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                              ข้อเสนอแนะ
                            </label>
                            <input
                              type="text"
                              value={gradeFeedbackInput}
                              onChange={(e) => setGradeFeedbackInput(e.target.value)}
                              placeholder="เช่น ทำได้ดีมาก"
                              className="w-full min-h-[40px] mt-0.5 px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={gradeBusy}
                            onClick={() => void handleSaveSubmissionGrade(sub)}
                            className="flex-1 min-h-[40px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                          >
                            {gradeBusy ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setGradingSubId(null)}
                            className="min-h-[40px] px-3 rounded-xl border border-[var(--color-border)] text-xs font-semibold cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              );
            }}
          />
        </div>
      )}

      {/* ASSIGNMENTS LIST (BOTH TEACHER ASSIGNMENTS OVERVIEW AND STUDENT VIEW) */}
      {(!isStaff || teacherSection === 'assignments') && (
        <PagedList
          items={isStaff ? teacherFilteredAssignments : filteredStudentAssignments}
          pageSize={4}
          previousLabel={lang === 'th' ? 'ก่อนหน้า' : 'Previous'}
          nextLabel={lang === 'th' ? 'ถัดไป' : 'Next'}
          paginationLabel={lang === 'th' ? 'เปลี่ยนหน้าการบ้าน' : 'Homework pages'}
          emptyState={
            <div className="text-center py-10 text-[var(--color-text-muted)] text-xs rounded-2xl border border-dashed border-[var(--color-border)]">
              ไม่มีการบ้านในหมวดนี้
            </div>
          }
          renderItem={(asg) => {
            const course = scopedCourses.find((c) => c.id === asg.courseId);
            const stuSub = !isStaff ? studentSubmissionMap.get(asg.id) : undefined;
            const isDone =
              !isStaff &&
              (Boolean(stuSub && stuSub.status !== 'pending') ||
                myCompletedSubmissions.has(asg.id) ||
                Boolean(currentPersonId && asg.submittedStudentIds?.includes(currentPersonId)));
            const isExpanded = expandedAssignmentId === asg.id;
            const submittedCount = asg.submittedStudentIds?.length || 0;

            return (
              <div
                key={asg.id}
                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[var(--color-text-muted)] truncate">
                    {course?.code || asg.courseCode || ''} · {course?.titleTh || 'วิชาเรียน'}
                  </span>
                  {isStaff ? (
                    <span className="font-bold text-[var(--color-primary-text)] tabular-nums shrink-0">
                      ส่งแล้ว {submittedCount} คน
                    </span>
                  ) : (
                    <span
                      className={`font-bold shrink-0 ${
                        stuSub?.status === 'graded'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : stuSub?.status === 'late'
                            ? 'text-rose-700 dark:text-rose-400'
                            : isDone
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {stuSub?.status === 'graded'
                        ? `ตรวจแล้ว ${stuSub.score ?? 0}/${stuSub.maxScore}`
                        : stuSub?.status === 'late'
                          ? 'ส่งช้า (รอตรวจ)'
                          : isDone
                            ? 'ส่งแล้ว'
                            : 'รอส่ง'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedAssignmentId(isExpanded ? null : asg.id)}
                  className="w-full text-left cursor-pointer"
                >
                  <h4 className="font-bold text-sm text-[var(--color-text-title)]">
                    {lang === 'th' ? asg.titleTh || asg.titleEn : asg.titleEn || asg.titleTh}
                  </h4>
                  {asg.description && (
                    <p
                      className={`mt-1 text-xs text-[var(--color-text-body)] whitespace-pre-line ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {asg.description}
                    </p>
                  )}
                </button>

                {stuSub?.teacherFeedback && (
                  <p className="p-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-[11px] text-emerald-900 dark:text-emerald-200">
                    ความเห็นครู: {stuSub.teacherFeedback}
                  </p>
                )}

                <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>กำหนดส่ง: {asg.dueDate}</span>
                  </span>
                  <span className="font-semibold text-[var(--color-text-title)]">{asg.maxScore ?? asg.points} คะแนน</span>
                </div>

                {/* Student Submit Button */}
                {!isStaff && canStudentSubmit && asg.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittingAssignment(asg);
                      setSubmitText(stuSub?.textSubmission || '');
                      setSubmitFileMeta(stuSub?.fileAttachment || null);
                    }}
                    className={`w-full min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                      isDone
                        ? 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]'
                        : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{isDone ? 'ดูงานที่ส่ง / ส่งเพิ่มเติม' : 'ส่งการบ้านชิ้นนี้'}</span>
                  </button>
                )}
              </div>
            );
          }}
        />
      )}

      {/* STUDENT HOMEWORK SUBMISSION SHEET */}
      <BaseModal
        isOpen={Boolean(submittingAssignment)}
        onClose={() => setSubmittingAssignment(null)}
        title={submittingAssignment?.titleTh || 'ส่งการบ้านออนไลน์'}
        subtitle={
          submittingAssignment
            ? `ส่งการบ้านออนไลน์ · กำหนดส่ง ${submittingAssignment.dueDate} · เต็ม ${submittingAssignment.maxScore ?? submittingAssignment.points} คะแนน`
            : undefined
        }
        icon={<FileCheck2 className="w-4 h-4 text-[var(--color-primary-text)]" />}
        showMobileHandle
        maxWidthClass="max-w-md"
        surfaceClassName="rounded-t-3xl sm:rounded-3xl"
        bodyClassName="flex-1 min-h-0 overflow-y-auto p-5 space-y-4"
        footer={
          <button
            type="submit"
            form="mobile-homework-submit-form"
            disabled={submitBusy}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{submitBusy ? 'กำลังส่ง...' : 'ยืนยันส่งการบ้าน'}</span>
          </button>
        }
      >
        {submittingAssignment && (
          <>
            {submittingAssignment.description && (
              <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-body)] whitespace-pre-line">
                {submittingAssignment.description}
              </div>
            )}

            <form id="mobile-homework-submit-form" onSubmit={handleStudentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text-title)]">
                  คำตอบ / ลิงก์งาน / หมายเหตุถึงครู
                </label>
                <textarea
                  rows={4}
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  placeholder="พิมพ์คำตอบ หรือวางลิงก์ Google Docs / รูปภาพ..."
                  className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-title)] block">
                  แนบไฟล์ประกอบ (ไม่บังคับ)
                </label>
                <label className="min-h-[44px] px-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-xs text-[var(--color-text-body)] cursor-pointer">
                  <span className="flex items-center gap-2 truncate">
                    <Paperclip className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                    <span className="truncate">
                      {submitFileMeta ? `${submitFileMeta.name} (${submitFileMeta.size})` : 'เลือกไฟล์รูป / PDF / เอกสาร'}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const kb = Math.max(1, Math.round(f.size / 1024));
                      setSubmitFileMeta({
                        name: f.name,
                        size: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`,
                        type: f.type || 'application/octet-stream',
                      });
                    }}
                  />
                </label>
              </div>
            </form>
          </>
        )}
      </BaseModal>
    </div>
  );
};
