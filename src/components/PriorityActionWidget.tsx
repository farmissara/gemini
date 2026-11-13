import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarX2,
  Check,
  CheckCircle2,
  Phone,
  Search,
  UserCheck,
} from 'lucide-react';
import {
  AppLanguage,
  Assignment,
  AttendanceRecord,
  Course,
  HomeworkSubmission,
  LeaveRequest,
  PeriodAttendanceRecord,
  Student,
} from '../types';
import { NavTab } from './layout/Sidebar';
import { getLocalDateString } from '../lib/date';

interface PriorityActionWidgetProps {
  students: Student[];
  courses: Course[];
  attendance: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  homeworkSubmissions?: HomeworkSubmission[];
  assignments?: Assignment[];
  schoolId?: string;
  lang: AppLanguage;
  onNavigate: (tab: NavTab) => void;
  onSelectStudent?: (student: Student) => void;
}

type FilterMode = 'all' | 'absence' | 'homework';

interface PriorityStudentItem {
  student: Student;
  urgencyScore: number;
  unexcusedAbsences: {
    count: number;
    latestDate: string;
    hasRejectedLeave: boolean;
    hasPendingLeave: boolean;
    isNoCheckinTodayOnly: boolean;
  } | null;
  missingHomework: {
    count: number;
    overdueCount: number;
    items: {
      title: string;
      courseCode: string;
      dueDate: string;
      isOverdue: boolean;
    }[];
  } | null;
}

function getApprovedLeaveDatesForStudent(
  studentId: string,
  leaveRequests: LeaveRequest[]
): LeaveRequest[] {
  return leaveRequests.filter(
    (req) => req.userId === studentId && req.status === 'approved'
  );
}

function isDateCoveredByLeave(date: string, leaves: LeaveRequest[]): boolean {
  return leaves.some((req) => req.startDate <= date && req.endDate >= date);
}

function matchesCourseEnrollment(student: Student, course: Course): boolean {
  if (course.enrolledStudentIds && course.enrolledStudentIds.length > 0) {
    return course.enrolledStudentIds.includes(student.id);
  }
  if (course.room && student.room) {
    return course.room.trim().toLowerCase() === student.room.trim().toLowerCase();
  }
  return false;
}

export const PriorityActionWidget: React.FC<PriorityActionWidgetProps> = ({
  students,
  courses,
  attendance,
  periodAttendance = [],
  leaveRequests = [],
  homeworkSubmissions = [],
  assignments = [],
  schoolId = 'default',
  lang,
  onNavigate,
  onSelectStudent,
}) => {
  const todayStr = getLocalDateString();
  const storageKey = `eduverse_priority_followed_${schoolId}_${todayStr}`;

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideFollowedUp, setHideFollowedUp] = useState(false);
  const [followedUpIds, setFollowedUpIds] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setFollowedUpIds(raw ? JSON.parse(raw) : {});
    } catch {
      setFollowedUpIds({});
    }
  }, [storageKey]);

  const toggleFollowUp = (studentId: string) => {
    setFollowedUpIds((prev) => {
      const next = { ...prev };
      if (next[studentId]) {
        delete next[studentId];
      } else {
        next[studentId] = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
      }
      return next;
    });
  };

  const priorityItems = useMemo<PriorityStudentItem[]>(() => {
    const activeStudents = students.filter((s) => s.status === 'active');
    const courseById = new Map<string, Course>(courses.map((c) => [c.id, c]));

    const todayStudentCheckins = new Set(
      attendance
        .filter(
          (a) =>
            a.date === todayStr &&
            a.recordType !== 'check_out' &&
            a.userType !== 'teacher' &&
            (a.status === 'present' || a.status === 'late')
        )
        .map((a) => a.studentId)
    );
    const hasCheckinActivityToday = todayStudentCheckins.size > 0;

    const results: PriorityStudentItem[] = [];

    for (const student of activeStudents) {
      const approvedLeaves = getApprovedLeaveDatesForStudent(student.id, leaveRequests);
      const studentLeaves = leaveRequests.filter((req) => req.userId === student.id);

      // 1. Evaluate unexcused absences (daily + period absent records without approved leave)
      const explicitAbsentDates = new Set<string>();
      for (const rec of attendance) {
        if (
          rec.studentId === student.id &&
          rec.recordType !== 'check_out' &&
          rec.status === 'absent' &&
          !isDateCoveredByLeave(rec.date, approvedLeaves)
        ) {
          explicitAbsentDates.add(rec.date);
        }
      }
      for (const pRec of periodAttendance) {
        if (
          pRec.studentId === student.id &&
          pRec.status === 'absent' &&
          !isDateCoveredByLeave(pRec.date, approvedLeaves)
        ) {
          explicitAbsentDates.add(pRec.date);
        }
      }

      const sortedExplicitDates = Array.from(explicitAbsentDates).sort((a, b) =>
        b.localeCompare(a)
      );

      let unexcusedAbsences: PriorityStudentItem['unexcusedAbsences'] = null;
      if (sortedExplicitDates.length > 0) {
        const latestDate = sortedExplicitDates[0];
        const hasRejectedLeave = studentLeaves.some(
          (l) => l.status === 'rejected' && l.startDate <= latestDate && l.endDate >= latestDate
        );
        const hasPendingLeave = studentLeaves.some(
          (l) => l.status === 'pending' && l.startDate <= latestDate && l.endDate >= latestDate
        );
        unexcusedAbsences = {
          count: sortedExplicitDates.length,
          latestDate,
          hasRejectedLeave,
          hasPendingLeave,
          isNoCheckinTodayOnly: false,
        };
      } else if (
        hasCheckinActivityToday &&
        !todayStudentCheckins.has(student.id) &&
        !isDateCoveredByLeave(todayStr, approvedLeaves)
      ) {
        const hasPendingLeave = studentLeaves.some(
          (l) => l.status === 'pending' && l.startDate <= todayStr && l.endDate >= todayStr
        );
        const hasRejectedLeave = studentLeaves.some(
          (l) => l.status === 'rejected' && l.startDate <= todayStr && l.endDate >= todayStr
        );
        unexcusedAbsences = {
          count: 1,
          latestDate: todayStr,
          hasRejectedLeave,
          hasPendingLeave,
          isNoCheckinTodayOnly: true,
        };
      }

      // 2. Evaluate missing homework (pending submissions + unsubmitted active assignments)
      const hwItemsMap = new Map<
        string,
        { title: string; courseCode: string; dueDate: string; isOverdue: boolean }
      >();

      const stuSubmissions = homeworkSubmissions.filter((h) => h.studentId === student.id);
      const completedAssignmentIds = new Set(
        stuSubmissions
          .filter((h) => h.status !== 'pending')
          .map((h) => h.assignmentId)
      );

      for (const sub of stuSubmissions) {
        if (sub.status === 'pending') {
          const isOverdue = Boolean(sub.dueDate && sub.dueDate < todayStr);
          hwItemsMap.set(sub.assignmentId || sub.id, {
            title: sub.assignmentTitle,
            courseCode: sub.courseCode || '-',
            dueDate: sub.dueDate || '-',
            isOverdue,
          });
        }
      }

      for (const asg of assignments) {
        if (asg.status !== 'active') continue;
        if (completedAssignmentIds.has(asg.id)) continue;
        if (asg.submittedStudentIds?.includes(student.id)) continue;
        const course = courseById.get(asg.courseId);
        if (!course || !matchesCourseEnrollment(student, course)) continue;

        if (!hwItemsMap.has(asg.id)) {
          const isOverdue = Boolean(asg.dueDate && asg.dueDate < todayStr);
          hwItemsMap.set(asg.id, {
            title: lang === 'th' ? asg.titleTh : asg.titleEn || asg.titleTh,
            courseCode: asg.courseCode || course.code || '-',
            dueDate: asg.dueDate || '-',
            isOverdue,
          });
        }
      }

      const missingHwList = Array.from(hwItemsMap.values()).sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate)
      );
      const overdueCount = missingHwList.filter((item) => item.isOverdue).length;

      const missingHomework: PriorityStudentItem['missingHomework'] =
        missingHwList.length > 0
          ? {
              count: missingHwList.length,
              overdueCount,
              items: missingHwList,
            }
          : null;

      if (!unexcusedAbsences && !missingHomework) continue;

      const absenceWeight = unexcusedAbsences
        ? unexcusedAbsences.isNoCheckinTodayOnly
          ? 20
          : 50 + unexcusedAbsences.count * 20
        : 0;
      const hwWeight = missingHomework
        ? missingHomework.count * 12 + missingHomework.overdueCount * 15
        : 0;

      results.push({
        student,
        urgencyScore: absenceWeight + hwWeight,
        unexcusedAbsences,
        missingHomework,
      });
    }

    return results.sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      return a.student.studentIdNumber.localeCompare(b.student.studentIdNumber);
    });
  }, [
    students,
    courses,
    attendance,
    periodAttendance,
    leaveRequests,
    homeworkSubmissions,
    assignments,
    todayStr,
    lang,
  ]);

  const counts = useMemo(() => {
    const absenceOnly = priorityItems.filter((item) => item.unexcusedAbsences !== null).length;
    const homeworkOnly = priorityItems.filter((item) => item.missingHomework !== null).length;
    const followed = priorityItems.filter((item) => Boolean(followedUpIds[item.student.id])).length;
    return {
      all: priorityItems.length,
      absence: absenceOnly,
      homework: homeworkOnly,
      followed,
    };
  }, [priorityItems, followedUpIds]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return priorityItems.filter((item) => {
      if (filterMode === 'absence' && !item.unexcusedAbsences) return false;
      if (filterMode === 'homework' && !item.missingHomework) return false;
      if (hideFollowedUp && followedUpIds[item.student.id]) return false;
      if (!q) return true;
      const fullNameTh = `${item.student.firstNameTh} ${item.student.lastNameTh}`.toLowerCase();
      const fullNameEn = `${item.student.firstNameEn} ${item.student.lastNameEn}`.toLowerCase();
      return (
        fullNameTh.includes(q) ||
        fullNameEn.includes(q) ||
        item.student.studentIdNumber.toLowerCase().includes(q) ||
        (item.student.room || '').toLowerCase().includes(q)
      );
    });
  }, [priorityItems, filterMode, hideFollowedUp, followedUpIds, searchTerm]);

  const visibleItems = filteredItems.slice(0, 8);

  return (
    <section
      aria-label={lang === 'th' ? 'รายการเร่งด่วนสำหรับครู' : 'Priority Actions'}
      className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden"
    >
      {/* Header Row */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="text-sm font-bold text-[var(--color-text-title)]">
                {lang === 'th'
                  ? 'การดำเนินการเร่งด่วน (Priority Action)'
                  : 'Priority Actions'}
              </h2>
              <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {lang === 'th'
                  ? `${counts.all} รายชื่อต้องติดตาม · ติดตามแล้ววันนี้ ${counts.followed}`
                  : `${counts.all} students needing follow-up · ${counts.followed} contacted today`}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {lang === 'th'
                ? 'รวบรวมนักเรียนที่ขาดเรียนโดยไม่พบใบลาอนุมัติหรือมีงานค้างส่ง เพื่อให้ครูติดตามช่วยเหลือได้ทันท่วงที'
                : 'Proactively surfaces students with unexcused absences or missing homework for timely teacher intervention.'}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="tablist"
            aria-label={lang === 'th' ? 'กรองตามประเภทปัญหา' : 'Filter priority items'}
            className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] p-0.5 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'all'}
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                filterMode === 'all'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? `ทั้งหมด (${counts.all})` : `All (${counts.all})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'absence'}
              onClick={() => setFilterMode('absence')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                filterMode === 'absence'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? `ขาดเรียน (${counts.absence})` : `Absences (${counts.absence})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'homework'}
              onClick={() => setFilterMode('homework')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap tabular-nums ${
                filterMode === 'homework'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-body)] hover:text-[var(--color-text-title)]'
              }`}
            >
              {lang === 'th' ? `ค้างส่งงาน (${counts.homework})` : `Missing Work (${counts.homework})`}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-toolbar: Search + Hide Followed Toggle */}
      <div className="px-4 py-2 bg-[var(--color-card-subtle)] border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาชื่อ, รหัส, ห้อง...' : 'Search student, ID, room...'}
            className="w-full pl-8 pr-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] text-xs focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[var(--color-text-body)] font-medium cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={hideFollowedUp}
              onChange={(e) => setHideFollowedUp(e.target.checked)}
              className="rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
            />
            <span>{lang === 'th' ? 'ซ่อนรายการที่ติดตามแล้ววันนี้' : 'Hide followed up today'}</span>
          </label>

          <button
            type="button"
            onClick={() => onNavigate('executive_warning')}
            className="text-[var(--color-primary-text)] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>{lang === 'th' ? 'ศูนย์เตือนภัยล่วงหน้า' : 'Early Warning'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dense List / Empty State */}
      {filteredItems.length === 0 ? (
        <div className="py-10 px-4 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-[var(--color-text-title)]">
            {counts.all === 0
              ? lang === 'th'
                ? 'ไม่พบนักเรียนที่ขาดเรียนโดยไม่แจ้งลาหรือค้างส่งงานในขณะนี้'
                : 'No students currently flagged for unexcused absences or missing homework'
              : lang === 'th'
                ? 'ไม่พบรายการที่ตรงกับเงื่อนไขการกรอง'
                : 'No matching intervention items'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {lang === 'th'
              ? 'สามารถตรวจสอบบันทึกการเข้าเรียนและสถานะงานมอบหมายทั้งหมดได้จากเมนูที่เกี่ยวข้อง'
              : 'You can inspect full attendance logs and assignment submissions anytime.'}
          </p>
          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {lang === 'th' ? 'ดูบันทึกการเข้าเรียน' : 'View Attendance'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('homework')}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {lang === 'th' ? 'ตรวจสถานะการบ้าน' : 'View Homework'}
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {visibleItems.map(({ student, unexcusedAbsences, missingHomework }) => {
            const followedTime = followedUpIds[student.id];
            const firstHw = missingHomework?.items[0];
            return (
              <div
                key={student.id}
                className={`px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition hover:bg-[var(--color-card-subtle)] ${
                  followedTime ? 'opacity-65' : ''
                }`}
              >
                {/* Left: Student Identity & Issue Summary */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <img
                    src={student.avatarUrl}
                    alt={`${student.firstNameTh} ${student.lastNameTh}`}
                    className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-bold text-[var(--color-text-title)]">
                        {lang === 'th'
                          ? `${student.firstNameTh} ${student.lastNameTh}`
                          : `${student.firstNameEn} ${student.lastNameEn}`}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--color-text-muted)] tabular-nums">
                        {student.studentIdNumber}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        · {student.gradeLevel} {student.room}
                      </span>
                      {student.guardianPhone && (
                        <span className="text-[11px] text-[var(--color-text-muted)] inline-flex items-center gap-1 tabular-nums">
                          · <Phone className="w-3 h-3 inline" /> {student.guardianPhone}
                        </span>
                      )}
                    </div>

                    {/* Specific Intervention Reasons (Clean unboxed semantic text) */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {unexcusedAbsences && (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                            unexcusedAbsences.isNoCheckinTodayOnly
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          <CalendarX2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {unexcusedAbsences.isNoCheckinTodayOnly
                              ? lang === 'th'
                                ? `ยังไม่เช็คชื่อวันนี้ (${unexcusedAbsences.latestDate}) · ไม่พบใบลา`
                                : `No check-in today (${unexcusedAbsences.latestDate}) · No leave`
                              : lang === 'th'
                                ? `ขาดเรียนไม่แจ้งลา ${unexcusedAbsences.count} ครั้ง · ล่าสุด ${unexcusedAbsences.latestDate}`
                                : `${unexcusedAbsences.count} unexcused absence(s) · Latest ${unexcusedAbsences.latestDate}`}
                            {unexcusedAbsences.hasRejectedLeave
                              ? lang === 'th'
                                ? ' (ใบลาถูกปฏิเสธ)'
                                : ' (Leave rejected)'
                              : unexcusedAbsences.hasPendingLeave
                                ? lang === 'th'
                                  ? ' (มีใบลารออนุมัติ)'
                                  : ' (Leave pending)'
                                : ''}
                          </span>
                        </span>
                      )}

                      {missingHomework && firstHw && (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                            missingHomework.overdueCount > 0
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-md">
                            {lang === 'th'
                              ? `ค้างส่งงาน ${missingHomework.count} ชิ้น${
                                  missingHomework.overdueCount > 0
                                    ? ` (เลยกำหนด ${missingHomework.overdueCount})`
                                    : ''
                                } · ${firstHw.courseCode} กำหนด ${firstHw.dueDate}`
                              : `${missingHomework.count} missing work${
                                  missingHomework.overdueCount > 0
                                    ? ` (${missingHomework.overdueCount} overdue)`
                                    : ''
                                } · ${firstHw.courseCode} due ${firstHw.dueDate}`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Direct Action Controls */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
                  {onSelectStudent && (
                    <button
                      type="button"
                      onClick={() => onSelectStudent(student)}
                      className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {lang === 'th' ? 'ข้อมูล/ผู้ปกครอง' : 'Profile'}
                    </button>
                  )}

                  {unexcusedAbsences && (
                    <button
                      type="button"
                      onClick={() => onNavigate('attendance')}
                      className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {lang === 'th' ? 'เช็คชื่อ/ใบลา' : 'Attendance'}
                    </button>
                  )}

                  {missingHomework && (
                    <button
                      type="button"
                      onClick={() => onNavigate('homework')}
                      className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {lang === 'th' ? 'ติดตามงาน' : 'Homework'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleFollowUp(student.id)}
                    className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap transition ${
                      followedTime
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                        : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                    }`}
                  >
                    {followedTime ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span className="tabular-nums">
                          {lang === 'th' ? `ติดตามแล้ว ${followedTime}` : `Done ${followedTime}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'บันทึกการติดตาม' : 'Mark Contacted'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredItems.length > visibleItems.length && (
        <div className="px-4 py-2 bg-[var(--color-card-subtle)] border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)] tabular-nums">
          <span>
            {lang === 'th'
              ? `แสดง ${visibleItems.length} จากทั้งหมด ${filteredItems.length} รายการ (เรียงตามความเร่งด่วน)`
              : `Showing ${visibleItems.length} of ${filteredItems.length} priority students`}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer"
            >
              {lang === 'th' ? 'จัดการเช็คชื่อทั้งหมด' : 'All Attendance'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('homework')}
              className="text-[var(--color-primary-text)] hover:underline font-semibold cursor-pointer"
            >
              {lang === 'th' ? 'จัดการงานค้างส่งทั้งหมด' : 'All Homework'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
