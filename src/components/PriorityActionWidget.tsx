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
import { emitMascotDashboardEvent } from './guide/InteractiveMascotGuide';

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
  compact?: boolean;
  embedded?: boolean;
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
  compact = true,
  embedded = false,
}) => {
  const todayStr = getLocalDateString();
  const storageKey = `eduverse_priority_followed_${schoolId}_${todayStr}`;

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hideFollowedUp, setHideFollowedUp] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
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
    const willMarkFollowed = !followedUpIds[studentId];
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

    if (willMarkFollowed) {
      const targetStudent = students.find((s) => s.id === studentId);
      const studentName = targetStudent
        ? lang === 'th'
          ? `${targetStudent.firstNameTh} ${targetStudent.lastNameTh}`
          : `${targetStudent.firstNameEn} ${targetStudent.lastNameEn}`
        : '';
      emitMascotDashboardEvent({
        type: 'success',
        titleTh: 'บันทึกการติดตามแล้ว',
        titleEn: 'Follow-Up Recorded',
        messageTh: studentName
          ? `บันทึกการติดตาม ${studentName} เรียบร้อยแล้ว`
          : 'บันทึกสถานะการติดต่อติดตามนักเรียนเรียบร้อยแล้ว',
        messageEn: studentName
          ? `Recorded follow-up status for ${studentName}.`
          : 'Student follow-up status saved.',
      });
    }
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

  const defaultLimit = compact ? 4 : 6;
  const visibleItems = showAllRows ? filteredItems.slice(0, 12) : filteredItems.slice(0, defaultLimit);

  return (
    <section
      aria-label={lang === 'th' ? 'รายการเร่งด่วนสำหรับครู' : 'Priority Actions'}
      className={embedded ? 'flex flex-col justify-between h-full print-avoid-break' : 'saas-card dash-card flex flex-col justify-between h-full print-avoid-break'}
    >
      <div className="dash-card-stack">
        {/* Clean Header Row (No boxed icon badge) */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h3 className="type-section-title flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${counts.all > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-muted)]'}`} />
              <span>{lang === 'th' ? 'รายการเร่งด่วน' : 'Priority Actions'}</span>
              <span className="type-meta font-normal">
                · {lang === 'th'
                  ? `ค้าง ${counts.all} · ติดตามแล้ว ${counts.followed}`
                  : `${counts.all} urgent · ${counts.followed} done`}
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              if (counts.all > 0) {
                emitMascotDashboardEvent({
                  type: 'warning',
                  titleTh: 'มีรายการเร่งด่วนรอตรวจสอบ',
                  titleEn: 'Urgent Items Need Attention',
                  messageTh: `พบนักเรียนเร่งด่วน ${counts.all} รายการ กำลังพาไปยังหน้าเตือนภัย`,
                  messageEn: `${counts.all} priority student alerts require attention.`,
                });
              }
              onNavigate('executive_warning');
            }}
            className="no-print type-meta font-semibold text-[var(--color-primary-text)] hover:underline inline-flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
            title={lang === 'th' ? 'เปิดระบบเตือนภัยและวิเคราะห์ความเสี่ยงผู้เรียน' : 'Open Early Warning & Risk Alerts'}
          >
            <span>{lang === 'th' ? 'เตือนภัย' : 'Alerts'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Filter + Search Toolbar (Single Clean Row) */}
        <div className="no-print flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label={lang === 'th' ? 'กรองตามประเภทปัญหา' : 'Filter priority items'}
            className="seg-tab-group type-meta shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'all'}
              data-active={filterMode === 'all'}
              onClick={() => setFilterMode('all')}
              className="seg-tab-btn tabular-nums"
            >
              {lang === 'th' ? `ทั้งหมด (${counts.all})` : `All (${counts.all})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'absence'}
              data-active={filterMode === 'absence'}
              onClick={() => setFilterMode('absence')}
              className="seg-tab-btn inline-flex items-center gap-1 tabular-nums"
            >
              <CalendarX2 className="w-3 h-3 shrink-0" />
              <span>{lang === 'th' ? `ขาด (${counts.absence})` : `Absent (${counts.absence})`}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'homework'}
              data-active={filterMode === 'homework'}
              onClick={() => setFilterMode('homework')}
              className="seg-tab-btn inline-flex items-center gap-1 tabular-nums"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>{lang === 'th' ? `งาน (${counts.homework})` : `Work (${counts.homework})`}</span>
            </button>
          </div>

          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อ / ห้อง...' : 'Search...'}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] placeholder-[var(--color-text-muted)] type-label focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <label className="inline-flex items-center gap-1.5 type-meta cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={hideFollowedUp}
              onChange={(e) => setHideFollowedUp(e.target.checked)}
              className="rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
            />
            <span>{lang === 'th' ? 'ซ่อนที่ติดตามแล้ว' : 'Hide done'}</span>
          </label>
        </div>

        {/* Clean Hairline List */}
        {filteredItems.length === 0 ? (
          <div className="py-6 px-3 text-center space-y-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="type-label">
              {counts.all === 0
                ? lang === 'th'
                  ? 'ไม่มีรายการขาดเรียนหรือค้างส่งงานเร่งด่วน'
                  : 'No urgent student flags right now'
                : lang === 'th'
                  ? 'ไม่พบรายการตามตัวกรองที่เลือก'
                  : 'No matching items'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {visibleItems.map(({ student, unexcusedAbsences, missingHomework }) => {
              const followedTime = followedUpIds[student.id];
              const firstHw = missingHomework?.items[0];
              const displayName =
                lang === 'th'
                  ? `${student.firstNameTh} ${student.lastNameTh}`
                  : `${student.firstNameEn} ${student.lastNameEn}`;
              return (
                <div
                  key={student.id}
                  className={`dash-row first:pt-1 last:pb-1 flex items-center justify-between gap-2.5 transition ${
                    followedTime ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {student.avatarUrl ? (
                      <img
                        src={student.avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] type-label flex items-center justify-center shrink-0">
                        {(student.firstNameTh || student.firstNameEn || 'S').slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        {onSelectStudent ? (
                          <button
                            type="button"
                            onClick={() => onSelectStudent(student)}
                            className="type-card-title truncate hover:text-[var(--color-primary-text)] hover:underline cursor-pointer text-left"
                          >
                            {displayName}
                          </button>
                        ) : (
                          <span className="type-card-title truncate">{displayName}</span>
                        )}
                        <span className="type-meta">
                          · {student.gradeLevel} {student.room}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 type-meta mt-0.5">
                        {unexcusedAbsences && (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                              unexcusedAbsences.isNoCheckinTodayOnly
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            <CalendarX2 className="w-3 h-3 shrink-0" />
                            <span>
                              {unexcusedAbsences.isNoCheckinTodayOnly
                                ? lang === 'th'
                                  ? 'ยังไม่เช็ควันนี้'
                                  : 'No check-in'
                                : lang === 'th'
                                  ? `ขาด ${unexcusedAbsences.count} ครั้ง`
                                  : `${unexcusedAbsences.count} absent`}
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
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span>
                              {lang === 'th'
                                ? `ค้างงาน ${missingHomework.count}`
                                : `${missingHomework.count} missing`}
                            </span>
                          </span>
                        )}
                        {student.guardianPhone && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Phone className="w-3 h-3" />
                            {student.guardianPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFollowUp(student.id)}
                    title={followedTime ? (lang === 'th' ? `ติดตามแล้วเมื่อ ${followedTime}` : `Followed at ${followedTime}`) : (lang === 'th' ? 'บันทึกว่าติดตามผู้ปกครองแล้ว' : 'Mark as contacted')}
                    className={`no-print px-2.5 py-1.5 rounded-lg type-meta font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition ${
                      followedTime
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                        : 'border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-[var(--color-text-title)] hover:bg-[var(--color-primary)] hover:text-white hover:border-transparent'
                    }`}
                  >
                    {followedTime ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span className="tabular-nums">{followedTime}</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3" />
                        <span>{lang === 'th' ? 'ติดตาม' : 'Follow'}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Show More */}
      {filteredItems.length > defaultLimit && (
        <div className="no-print dash-footer-divider mt-2.5 border-t border-[var(--color-border)] flex items-center justify-between type-meta">
          <span>
            {lang === 'th'
              ? `แสดง ${visibleItems.length} / ${filteredItems.length} รายการ`
              : `${visibleItems.length} of ${filteredItems.length}`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllRows((prev) => !prev)}
            className="font-semibold text-[var(--color-primary-text)] hover:underline cursor-pointer whitespace-nowrap"
          >
            {showAllRows
              ? lang === 'th'
                ? 'ย่อรายการ'
                : 'Show less'
              : lang === 'th'
                ? `ดูเพิ่ม (${filteredItems.length - defaultLimit})`
                : `View more (${filteredItems.length - defaultLimit})`}
          </button>
        </div>
      )}
    </section>
  );
};
