import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileEdit,
  FileText,
  HeartHandshake,
  HeartPulse,
  MoreVertical,
  Plus,
  Send,
  ShieldAlert,
  Thermometer,
  Video,
  X,
} from 'lucide-react';
import type {
  AppLanguage,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  Course,
  InfirmaryCategory,
  InfirmaryStatus,
  InfirmaryVisit,
  LeaveRequest,
  Lesson,
  PeriodAttendanceRecord,
  School,
  SdqAssessment,
  Student,
  UserRole,
} from '../../types';
import {
  ATTENDANCE_CORRECTIONS_UPDATED_EVENT,
  loadAttendanceCorrections,
  parseTimeToMinutes,
  type CorrectionIssueType,
  type CorrectionTargetScope,
} from '../../lib/attendanceCorrections';
import {
  buildPersonalDailyAttendanceRows,
  formatThaiShortDateLabel,
} from '../../lib/personalAttendanceHistory';
import { getLocalDateString } from '../../lib/date';
import { useSchoolCustomPresets } from '../../lib/schoolCustomPresets';
import { PersonalTimeCardPanel } from '../../components/attendance/PersonalTimeCardPanel';
import { PagedList } from '../../components/PagedList';
import { StatusBadge } from '../../components/common/StatusBadge';

/* -------------------------------------------------------------------------- */
/* 1. STUDENT / PARENT ATTENDANCE HISTORY TAB                                 */
/* -------------------------------------------------------------------------- */

export interface HistoryCorrectionPrefill {
  targetScope: CorrectionTargetScope;
  issueType: CorrectionIssueType;
  date: string;
  originalTime?: string;
  courseId?: string;
  periodNumber?: number;
}

interface MobileAttendanceHistoryTabProps {
  lang: AppLanguage;
  schoolId?: string;
  personName?: string;
  personalTargetIds?: string[];
  leaveRequests?: LeaveRequest[];
  scopedAttendance: AttendanceRecord[];
  scopedPeriodAttendance: PeriodAttendanceRecord[];
  courses: Course[];
  onBackHome: () => void;
  onOpenCorrectionFromHistory?: (prefill: HistoryCorrectionPrefill) => void;
  onOpenLeaveFromHistory?: (date: string) => void;
}

export const MobileAttendanceHistoryTab: React.FC<MobileAttendanceHistoryTabProps> = ({
  lang,
  schoolId = 'sch-1',
  personName,
  personalTargetIds,
  leaveRequests = [],
  scopedAttendance,
  scopedPeriodAttendance,
  courses,
  onBackHome,
  onOpenCorrectionFromHistory,
  onOpenLeaveFromHistory,
}) => {
  const [mode, setMode] = useState<'daily' | 'period'>('daily');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'leave'>('all');
  const [actionMenuTarget, setActionMenuTarget] = useState<
    | { kind: 'period'; record: PeriodAttendanceRecord; courseName: string }
    | null
  >(null);
  const [correctionRevision, setCorrectionRevision] = useState(0);

  useEffect(() => {
    const bump = () => setCorrectionRevision((v) => v + 1);
    window.addEventListener(ATTENDANCE_CORRECTIONS_UPDATED_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(ATTENDANCE_CORRECTIONS_UPDATED_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const todayDateStr = getLocalDateString();
  const targetIdSet = useMemo(() => {
    const set = new Set<string>(personalTargetIds?.filter(Boolean) || []);
    if (set.size === 0) {
      scopedAttendance.forEach((a) => {
        if (a.studentId) set.add(a.studentId);
        if (a.teacherId) set.add(a.teacherId);
      });
    }
    return set;
  }, [personalTargetIds, scopedAttendance]);

  const todayCheckInRecord = useMemo(
    () =>
      scopedAttendance
        .filter((a) => a.date === todayDateStr && (a.recordType || 'check_in') !== 'check_out')
        .sort((a, b) => (parseTimeToMinutes(b.time) ?? -1) - (parseTimeToMinutes(a.time) ?? -1))[0],
    [scopedAttendance, todayDateStr]
  );

  const todayCheckOutRecord = useMemo(
    () =>
      scopedAttendance
        .filter((a) => a.date === todayDateStr && a.recordType === 'check_out')
        .sort((a, b) => (parseTimeToMinutes(b.time) ?? -1) - (parseTimeToMinutes(a.time) ?? -1))[0],
    [scopedAttendance, todayDateStr]
  );

  const personalRows = useMemo(
    () =>
      buildPersonalDailyAttendanceRows({
        targetIds: targetIdSet,
        attendance: scopedAttendance,
        leaveRequests,
        correctionRequests: loadAttendanceCorrections(schoolId),
        schoolId,
        todayDateStr,
        daysLookback: 30,
      }),
    [targetIdSet, scopedAttendance, leaveRequests, schoolId, todayDateStr, correctionRevision]
  );

  const presentCount = scopedAttendance.filter((r) => r.status === 'present').length;
  const lateCount = scopedAttendance.filter((r) => r.status === 'late').length;
  const otherCount = Math.max(0, scopedAttendance.length - presentCount - lateCount);
  const rate =
    scopedAttendance.length > 0
      ? Math.round(((presentCount + lateCount) / scopedAttendance.length) * 100)
      : null;

  const filteredPeriod = useMemo(() => {
    return scopedPeriodAttendance
      .filter((r) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'leave') return r.status === 'excused';
        return r.status === statusFilter;
      })
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.periodNumber - a.periodNumber);
  }, [scopedPeriodAttendance, statusFilter]);

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">
          {lang === 'th' ? 'ประวัติการลงเวลาและมาเรียน' : 'Attendance History'}
        </h2>
      </div>

      {/* Summary Banner */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[11px] text-[var(--color-text-muted)]">รวม</p>
          <p className="text-lg font-extrabold text-[var(--color-text-title)] tabular-nums">
            {rate !== null ? `${rate}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--color-text-muted)]">ตรงเวลา</p>
          <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {presentCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--color-text-muted)]">สาย</p>
          <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
            {lateCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--color-text-muted)]">ลา/ขาด</p>
          <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {otherCount}
          </p>
        </div>
      </div>

      {/* Mode Switch */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setMode('daily')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            mode === 'daily'
              ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          เข้า/ออกโรงเรียน ({personalRows.length})
        </button>
        <button
          type="button"
          onClick={() => setMode('period')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            mode === 'period'
              ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          เข้า/ออกคาบเรียน ({scopedPeriodAttendance.length})
        </button>
      </div>

      {mode === 'period' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'present', label: 'ตรงเวลา' },
              { id: 'late', label: 'มาสาย' },
              { id: 'leave', label: 'ลา' },
              { id: 'absent', label: 'ขาด' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-body)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'daily' ? (
        <PersonalTimeCardPanel
          lang={lang}
          personName={personName}
          todayCheckInRecord={todayCheckInRecord}
          todayCheckOutRecord={todayCheckOutRecord}
          rows={personalRows}
          historyMaxHeightClass="max-h-[420px]"
          onOpenCorrectionFromHistory={
            onOpenCorrectionFromHistory
              ? (row) => {
                  const targetScope =
                    row.checkInTime && !row.checkOutTime ? 'gate_checkout' : 'gate_checkin';
                  const issueType: CorrectionIssueType = !row.checkInTime
                    ? 'forgot_checkin'
                    : !row.checkOutTime
                      ? 'forgot_checkout'
                      : row.statusKey === 'late'
                        ? 'late_arrival'
                        : 'time_mismatch';
                  onOpenCorrectionFromHistory({
                    targetScope,
                    issueType,
                    date: row.date,
                    originalTime:
                      targetScope === 'gate_checkout'
                        ? row.checkOutTime || ''
                        : row.checkInTime || '',
                  });
                }
              : undefined
          }
          onOpenLeaveFromHistory={
            onOpenLeaveFromHistory ? (row) => onOpenLeaveFromHistory(row.date) : undefined
          }
        />
      ) : (
        <PagedList
          items={filteredPeriod}
          pageSize={6}
          previousLabel="ก่อนหน้า"
          nextLabel="ถัดไป"
          emptyState={
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              ไม่มีประวัติการเช็คชื่อรายคาบในตัวกรองนี้
            </div>
          }
          renderItem={(rec) => {
            const course = courses.find((c) => c.id === rec.courseId || c.code === rec.courseCode);
            const courseName = course?.titleTh || rec.courseCode;
            return (
              <div
                key={rec.id}
                className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between gap-2.5 text-xs"
              >
                <div className="min-w-0 space-y-0.5 flex-1">
                  <p className="font-bold text-[var(--color-text-title)] truncate">{courseName}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums truncate">
                    {formatThaiShortDateLabel(rec.date)} · คาบ {rec.periodNumber} ({rec.timeSlot}) ·{' '}
                    {rec.recordType === 'check_out' ? 'ออกคาบ' : 'เข้าคาบ'}
                    {rec.actualCheckInTime ? ` ${rec.actualCheckInTime}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusBadge
                    size="xs"
                    status={
                      rec.status === 'present'
                        ? 'complete'
                        : rec.status === 'late'
                          ? 'pending'
                          : rec.status === 'excused'
                            ? 'info'
                            : 'delayed'
                    }
                    label={
                      rec.status === 'present'
                        ? 'เข้าเรียน'
                        : rec.status === 'late'
                          ? 'สาย'
                          : rec.status === 'excused'
                            ? 'ลา'
                            : 'ขาด'
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setActionMenuTarget({ kind: 'period', record: rec, courseName })
                    }
                    className="min-h-[44px] min-w-[44px] -mr-1.5 rounded-xl inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] hover:bg-[var(--color-card-subtle)] cursor-pointer transition"
                    aria-label={lang === 'th' ? 'เมนูจัดการรายการคาบเรียน' : 'Period row actions'}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}

      {/* Period Row Action Sheet (⋮) */}
      {actionMenuTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setActionMenuTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 pb-6 space-y-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--color-text-title)] truncate">
                  {actionMenuTarget.courseName} · คาบ {actionMenuTarget.record.periodNumber}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {formatThaiShortDateLabel(actionMenuTarget.record.date)} ({actionMenuTarget.record.timeSlot})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionMenuTarget(null)}
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-card-subtle)] cursor-pointer"
                aria-label={lang === 'th' ? 'ปิดเมนู' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {onOpenCorrectionFromHistory && (
              <button
                type="button"
                onClick={() => {
                  const rec = actionMenuTarget.record;
                  setActionMenuTarget(null);
                  const targetScope =
                    rec.recordType === 'check_out' ? 'period_checkout' : 'period_checkin';
                  const issueType: CorrectionIssueType =
                    rec.status === 'late'
                      ? 'late_arrival'
                      : rec.status === 'absent'
                        ? (targetScope === 'period_checkout' ? 'forgot_checkout' : 'forgot_checkin')
                        : 'time_mismatch';
                  onOpenCorrectionFromHistory({
                    targetScope,
                    issueType,
                    date: rec.date,
                    originalTime: rec.actualCheckInTime,
                    courseId: rec.courseId,
                    periodNumber: rec.periodNumber,
                  });
                }}
                className="w-full min-h-[48px] px-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] flex items-center gap-3 text-left cursor-pointer transition"
              >
                <FileEdit className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ขอแก้เวลา / ยืนยันเวลา' : 'Request time correction'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'แก้เวลาเข้า-ออก มาสาย หรือกรณีลืมสแกน'
                      : 'Fix late arrival or missing check-in/out'}
                  </p>
                </div>
              </button>
            )}

            {onOpenLeaveFromHistory && (
              <button
                type="button"
                onClick={() => {
                  const date = actionMenuTarget.record.date;
                  setActionMenuTarget(null);
                  onOpenLeaveFromHistory(date);
                }}
                className="w-full min-h-[48px] px-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] flex items-center gap-3 text-left cursor-pointer transition"
              >
                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-title)]">
                    {lang === 'th' ? 'ยื่นใบลาสำหรับวันนี้' : 'Submit leave request'}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {lang === 'th'
                      ? 'ลาป่วย ลากิจ ลาไปราชการ พร้อมแนบหลักฐาน'
                      : 'Sick, personal, or official duty leave'}
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. TEACHER BEHAVIOR & SDQ MOBILE TAB                                       */
/* -------------------------------------------------------------------------- */

interface MobileBehaviorSdqTabProps {
  activeSchool: School;
  currentUser: AuthUser | null;
  lang: AppLanguage;
  students: Student[];
  behaviorRecords: BehaviorRecord[];
  sdqAssessments: SdqAssessment[];
  onAddBehaviorRecord?: (record: BehaviorRecord) => void;
  onAddSdqAssessment?: (sdq: SdqAssessment) => void;
  onBackHome: () => void;
}

export const MobileBehaviorSdqTab: React.FC<MobileBehaviorSdqTabProps> = ({
  activeSchool,
  currentUser,
  lang,
  students,
  behaviorRecords,
  sdqAssessments,
  onAddBehaviorRecord,
  onAddSdqAssessment,
  onBackHome,
}) => {
  const { presets } = useSchoolCustomPresets(activeSchool.id);
  const [subTab, setSubTab] = useState<'behavior' | 'sdq' | 'history'>('behavior');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [recordType, setRecordType] = useState<'merit' | 'demerit'>('merit');
  const [category, setCategory] = useState(presets.behaviorMeritPresets[0]?.label || 'ช่วยงานครู / จิตอาสา');
  const [points, setPoints] = useState<number>(presets.behaviorMeritPresets[0]?.points || 5);
  const [notes, setNotes] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // SDQ form state
  const [sdqEmotional, setSdqEmotional] = useState(2);
  const [sdqConduct, setSdqConduct] = useState(1);
  const [sdqHyper, setSdqHyper] = useState(2);
  const [sdqPeer, setSdqPeer] = useState(1);
  const [sdqProsocial, setSdqProsocial] = useState(8);
  const [sdqNotes, setSdqNotes] = useState('');

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.firstNameTh} ${s.lastNameTh} ${s.studentIdNumber} ${s.gradeLevel} ${s.room}`.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || filteredStudents[0];

  const getStudentBehaviorScore = (student: Student | undefined) => {
    if (!student) return 100;
    const base = student.behaviorScore ?? 100;
    const delta = behaviorRecords
      .filter((r) => r.studentId === student.id)
      .reduce((acc, r) => acc + r.points, 0);
    return Math.max(0, Math.min(100, base + delta));
  };

  const totalDifficulties = sdqEmotional + sdqConduct + sdqHyper + sdqPeer;
  const sdqStatus: SdqAssessment['overallStatus'] =
    totalDifficulties >= 16 ? 'problem' : totalDifficulties >= 12 ? 'risk' : 'normal';

  const handleSaveBehavior = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !onAddBehaviorRecord) return;
    const signedPts = recordType === 'merit' ? Math.abs(points) : -Math.abs(points);
    onAddBehaviorRecord({
      id: `beh-${Date.now()}`,
      schoolId: activeStudent.schoolId || activeSchool.id,
      studentId: activeStudent.id,
      studentName: `${activeStudent.firstNameTh} ${activeStudent.lastNameTh}`.trim(),
      studentRoom: `${activeStudent.gradeLevel} ${activeStudent.room}`.trim(),
      date: getLocalDateString(),
      type: recordType,
      points: signedPts,
      category: category || (recordType === 'merit' ? 'ความดี' : 'ตักเตือน'),
      notes: notes.trim() || (recordType === 'merit' ? 'บันทึกคะแนนความประพฤติเชิงบวก' : 'ตัดคะแนนความประพฤติ'),
      recordedBy: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูผู้สอน',
    });
    setNotes('');
    setToast(`บันทึกคะแนน ${activeStudent.firstNameTh} (${signedPts > 0 ? `+${signedPts}` : signedPts}) แล้ว`);
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleSaveSdq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !onAddSdqAssessment) return;
    onAddSdqAssessment({
      id: `sdq-${Date.now()}`,
      schoolId: activeStudent.schoolId || activeSchool.id,
      studentId: activeStudent.id,
      studentName: `${activeStudent.firstNameTh} ${activeStudent.lastNameTh}`.trim(),
      studentRoom: `${activeStudent.gradeLevel} ${activeStudent.room}`.trim(),
      assessorType: 'teacher',
      assessorName: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูประจำชั้น',
      academicYear: activeSchool.academicYear || '2569',
      semester: activeSchool.currentSemester || '1',
      emotionalScore: sdqEmotional,
      conductScore: sdqConduct,
      hyperactivityScore: sdqHyper,
      peerScore: sdqPeer,
      prosocialScore: sdqProsocial,
      totalDifficultiesScore: totalDifficulties,
      overallStatus: sdqStatus,
      date: getLocalDateString(),
      notes: sdqNotes.trim() || undefined,
    });
    setSdqNotes('');
    setToast(`บันทึกผลคัดกรอง SDQ ของ ${activeStudent.firstNameTh} แล้ว`);
    window.setTimeout(() => setToast(null), 2600);
  };

  const activePresetList = recordType === 'merit' ? presets.behaviorMeritPresets : presets.behaviorDemeritPresets;

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">พฤติกรรม &amp; คัดกรอง SDQ</h2>
      </div>

      {toast && (
        <div role="status" className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setSubTab('behavior')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            subTab === 'behavior' ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)]'
          }`}
        >
          พฤติกรรม
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sdq')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            subTab === 'sdq' ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)]'
          }`}
        >
          ประเมิน SDQ
        </button>
        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            subTab === 'history' ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)]'
          }`}
        >
          ประวัติ ({behaviorRecords.length + sdqAssessments.length})
        </button>
      </div>

      {subTab !== 'history' && (
        <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส / ห้องนักเรียน..."
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
          />
          <select
            value={activeStudent?.id || ''}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)]"
          >
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.studentIdNumber} · {s.firstNameTh} {s.lastNameTh} ({s.gradeLevel} {s.room})
              </option>
            ))}
          </select>
          {activeStudent && (
            <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
              คะแนนความประพฤติปัจจุบัน:{' '}
              <strong className="text-[var(--color-primary-text)]">{getStudentBehaviorScore(activeStudent)} / 100</strong>
            </p>
          )}
        </div>
      )}

      {subTab === 'behavior' && (
        <form onSubmit={handleSaveBehavior} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRecordType('merit');
                const first = presets.behaviorMeritPresets[0];
                if (first) {
                  setCategory(first.label);
                  setPoints(first.points);
                }
              }}
              className={`min-h-[44px] rounded-xl border text-xs font-bold cursor-pointer ${
                recordType === 'merit'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                  : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
              }`}
            >
              + เพิ่มคะแนนความดี
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordType('demerit');
                const first = presets.behaviorDemeritPresets[0];
                if (first) {
                  setCategory(first.label);
                  setPoints(Math.abs(first.points));
                }
              }}
              className={`min-h-[44px] rounded-xl border text-xs font-bold cursor-pointer ${
                recordType === 'demerit'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                  : 'border-[var(--color-border)] bg-[var(--color-card-subtle)]'
              }`}
            >
              - หักคะแนนพฤติกรรม
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-text-muted)]">หัวข้อสำเร็จรูป</label>
            <select
              value={category}
              onChange={(e) => {
                const label = e.target.value;
                setCategory(label);
                const found = activePresetList.find((p) => p.label === label);
                if (found) setPoints(Math.abs(found.points));
              }}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
            >
              {activePresetList.map((p, idx) => (
                <option key={`${p.label}-${idx}`} value={p.label}>
                  {p.label} ({recordType === 'merit' ? `+${p.points}` : `-${Math.abs(p.points)}`})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">คะแนน</label>
              <input
                type="number"
                min={1}
                max={50}
                value={points}
                onChange={(e) => setPoints(Math.max(1, Number(e.target.value) || 1))}
                className="w-full min-h-[44px] mt-1 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono font-bold text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">รายละเอียดเพิ่มเติม</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="บันทึกเหตุการณ์..."
                className="w-full min-h-[44px] mt-1 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs"
              />
            </div>
          </div>

          <label className="flex items-center justify-between py-1 text-xs cursor-pointer">
            <span className="font-semibold text-[var(--color-text-title)]">ส่งแจ้งเตือนผู้ปกครอง</span>
            <input
              type="checkbox"
              checked={notifyParent}
              onChange={(e) => setNotifyParent(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
          </label>

          <button
            type="submit"
            disabled={!activeStudent || !onAddBehaviorRecord}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>บันทึกคะแนนพฤติกรรม</span>
          </button>
        </form>
      )}

      {subTab === 'sdq' && (
        <form onSubmit={handleSaveSdq} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3">
          <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] flex items-center justify-between text-xs">
            <span>ผลคัดกรองรวม 4 ด้าน (0–40):</span>
            <StatusBadge
              size="sm"
              status={sdqStatus === 'problem' ? 'delayed' : sdqStatus === 'risk' ? 'pending' : 'complete'}
              label={`${totalDifficulties} · ${sdqStatus === 'problem' ? 'มีปัญหา' : sdqStatus === 'risk' ? 'กลุ่มเสี่ยง' : 'ปกติ'}`}
            />
          </div>

          {(
            [
              { label: 'ด้านอารมณ์ (0-10)', val: sdqEmotional, set: setSdqEmotional },
              { label: 'ด้านความประพฤติ (0-10)', val: sdqConduct, set: setSdqConduct },
              { label: 'สมาธิ/อยู่ไม่นิ่ง (0-10)', val: sdqHyper, set: setSdqHyper },
              { label: 'ปัญหาด้านเพื่อน (0-10)', val: sdqPeer, set: setSdqPeer },
              { label: 'สัมพันธภาพทางสังคม จุดแข็ง (0-10)', val: sdqProsocial, set: setSdqProsocial },
            ] as const
          ).map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-title)]">{item.label}</span>
                <span className="font-mono font-bold tabular-nums text-[var(--color-primary-text)]">{item.val}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={item.val}
                onChange={(e) => item.set(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
          ))}

          <textarea
            rows={2}
            value={sdqNotes}
            onChange={(e) => setSdqNotes(e.target.value)}
            placeholder="ข้อสังเกต / แนวทางช่วยเหลือนักเรียน..."
            className="w-full p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs"
          />

          <button
            type="submit"
            disabled={!activeStudent || !onAddSdqAssessment}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>บันทึกผลประเมิน SDQ</span>
          </button>
        </form>
      )}

      {subTab === 'history' && (
        <PagedList
          items={behaviorRecords.slice().sort((a, b) => b.date.localeCompare(a.date))}
          pageSize={5}
          previousLabel="ก่อนหน้า"
          nextLabel="ถัดไป"
          emptyState={
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              ยังไม่มีประวัติพฤติกรรม
            </div>
          }
          renderItem={(rec) => (
            <div key={rec.id} className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-[var(--color-text-title)] truncate">{rec.studentName}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {rec.date} · {rec.category} · {rec.notes}
                </p>
              </div>
              <span className={`font-mono font-extrabold shrink-0 tabular-nums ${rec.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {rec.points > 0 ? `+${rec.points}` : rec.points}
              </span>
            </div>
          )}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. TEACHER INFIRMARY MOBILE TAB                                            */
/* -------------------------------------------------------------------------- */

interface MobileInfirmaryTabProps {
  activeSchool: School;
  currentUser: AuthUser | null;
  lang: AppLanguage;
  students: Student[];
  visits: InfirmaryVisit[];
  onAddInfirmaryVisit?: (visit: InfirmaryVisit) => void;
  onBackHome: () => void;
}

export const MobileInfirmaryTab: React.FC<MobileInfirmaryTabProps> = ({
  activeSchool,
  currentUser,
  lang,
  students,
  visits,
  onAddInfirmaryVisit,
  onBackHome,
}) => {
  const { presets } = useSchoolCustomPresets(activeSchool.id);
  const [tab, setTab] = useState<'new' | 'visits' | 'allergies'>('new');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [temperature, setTemperature] = useState('37.4');
  const [category, setCategory] = useState<InfirmaryCategory>('fever');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState(presets.infirmaryTreatments[0] || 'ให้นอนพักและสังเกตอาการ');
  const [medication, setMedication] = useState(presets.infirmaryMedications[0] || '');
  const [bedNumber, setBedNumber] = useState(presets.infirmaryBeds[0] || 'เตียง 1');
  const [status, setStatus] = useState<InfirmaryStatus>('resting');
  const [notifyParent, setNotifyParent] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.firstNameTh} ${s.lastNameTh} ${s.studentIdNumber} ${s.gradeLevel} ${s.room}`.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || filteredStudents[0];
  const allergyStudents = useMemo(
    () => students.filter((s) => (s.allergies && s.allergies.length > 0) || (s.chronicDiseases && s.chronicDiseases.length > 0)),
    [students]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !onAddInfirmaryVisit) return;
    onAddInfirmaryVisit({
      id: `inf-${Date.now()}`,
      schoolId: activeStudent.schoolId || activeSchool.id,
      studentId: activeStudent.id,
      studentName: `${activeStudent.firstNameTh} ${activeStudent.lastNameTh}`.trim(),
      gradeRoom: `${activeStudent.gradeLevel} ${activeStudent.room}`.trim(),
      visitDate: getLocalDateString(),
      visitTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      temperature: Number(temperature) || 37.0,
      symptoms: symptoms.trim() || 'รู้สึกไม่สบายตัว',
      category,
      treatment: treatment.trim(),
      medicationDispensed: medication.trim() || undefined,
      bedNumber: status === 'resting' ? bedNumber : undefined,
      status,
      recordedByNurse: currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูเวร / ห้องพยาบาล',
      parentNotified: notifyParent,
      notes: activeStudent.allergies?.length ? `ประวัติแพ้: ${activeStudent.allergies.join(', ')}` : undefined,
    });
    setSymptoms('');
    setToast(`บันทึกเข้าห้องพยาบาลของ ${activeStudent.firstNameTh} แล้ว`);
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">ห้องพยาบาล &amp; เวชระเบียน</h2>
      </div>

      {toast && (
        <div role="status" className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setTab('new')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            tab === 'new' ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)]'
          }`}
        >
          + รับผู้ป่วย
        </button>
        <button
          type="button"
          onClick={() => setTab('visits')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            tab === 'visits' ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)]'
          }`}
        >
          เคส ({visits.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('allergies')}
          className={`min-h-[40px] rounded-xl text-xs font-bold cursor-pointer ${
            tab === 'allergies' ? 'bg-[var(--color-card)] text-[var(--color-text-title)] shadow-xs' : 'text-[var(--color-text-muted)]'
          }`}
        >
          แพ้ยา ({allergyStudents.length})
        </button>
      </div>

      {tab === 'new' && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3 text-xs">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัสนักเรียน..."
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
          />
          <select
            value={activeStudent?.id || ''}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-semibold"
          >
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstNameTh} {s.lastNameTh} ({s.gradeLevel} {s.room})
              </option>
            ))}
          </select>

          {activeStudent && ((activeStudent.allergies && activeStudent.allergies.length > 0) || (activeStudent.chronicDiseases && activeStudent.chronicDiseases.length > 0)) && (
            <div className="p-2.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">คำเตือนประวัติสุขภาพ</p>
                {activeStudent.allergies?.length ? <p>แพ้: {activeStudent.allergies.join(', ')}</p> : null}
                {activeStudent.chronicDiseases?.length ? <p>โรคประจำตัว: {activeStudent.chronicDiseases.join(', ')}</p> : null}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-[var(--color-text-muted)]">อุณหภูมิ (°C)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full min-h-[44px] mt-1 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-[var(--color-text-muted)]">กลุ่มอาการ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InfirmaryCategory)}
                className="w-full min-h-[44px] mt-1 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
              >
                <option value="fever">มีไข้ / ตัวร้อน</option>
                <option value="headache">ปวดศีรษะ / เวียนหัว</option>
                <option value="stomach">ปวดท้อง / คลื่นไส้</option>
                <option value="injury">บาดเจ็บ / หกล้ม</option>
                <option value="allergy">ผื่นแพ้ / หอบหืด</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </div>
          </div>

          <input
            type="text"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="อาการสำคัญ เช่น ไข้สูง เจ็บคอ..."
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InfirmaryStatus)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
            >
              <option value="resting">นอนพักสังเกตอาการ</option>
              <option value="back_to_class">กลับเข้าเรียนแล้ว</option>
              <option value="sent_home">ผู้ปกครองรับกลับ</option>
              <option value="hospital_referral">ส่งต่อโรงพยาบาล</option>
            </select>
            <select
              value={bedNumber}
              onChange={(e) => setBedNumber(e.target.value)}
              disabled={status !== 'resting'}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] disabled:opacity-50"
            >
              {presets.infirmaryBeds.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="การปฐมพยาบาล..."
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
          />

          <input
            type="text"
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder="ยาที่จ่าย (ถ้ามี)..."
            className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
          />

          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="font-semibold text-[var(--color-text-title)]">แจ้งผู้ปกครอง</span>
            <input
              type="checkbox"
              checked={notifyParent}
              onChange={(e) => setNotifyParent(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
          </label>

          <button
            type="submit"
            disabled={!activeStudent || !onAddInfirmaryVisit}
            className="w-full min-h-[48px] rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <HeartPulse className="w-4 h-4" />
            <span>บันทึกเข้าห้องพยาบาล</span>
          </button>
        </form>
      )}

      {tab === 'visits' && (
        <PagedList
          items={visits.slice().sort((a, b) => (b.visitDate + b.visitTime).localeCompare(a.visitDate + a.visitTime))}
          pageSize={4}
          previousLabel="ก่อนหน้า"
          nextLabel="ถัดไป"
          emptyState={
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              ยังไม่มีรายการเข้าห้องพยาบาล
            </div>
          }
          renderItem={(v) => (
            <div key={v.id} className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-[var(--color-text-title)] truncate">{v.studentName} · {v.gradeRoom}</p>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 shrink-0">
                  <Thermometer className="w-3.5 h-3.5" />
                  {v.temperature}°C
                </span>
              </div>
              <p className="text-[var(--color-text-body)]">{v.symptoms} — {v.treatment}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                {v.visitDate} {v.visitTime} น. · {v.bedNumber || v.status}
              </p>
            </div>
          )}
        />
      )}

      {tab === 'allergies' && (
        <PagedList
          items={allergyStudents}
          pageSize={6}
          previousLabel="ก่อนหน้า"
          nextLabel="ถัดไป"
          emptyState={
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              ไม่พบนักเรียนที่มีประวัติแพ้ยาหรือโรคประจำตัว
            </div>
          }
          renderItem={(s) => (
            <div key={s.id} className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 space-y-1 text-xs">
              <p className="font-bold text-[var(--color-text-title)]">{s.firstNameTh} {s.lastNameTh} ({s.gradeLevel} {s.room})</p>
              {s.allergies?.length ? <p className="text-rose-700 dark:text-rose-300">แพ้: {s.allergies.join(', ')}</p> : null}
              {s.chronicDiseases?.length ? <p className="text-amber-700 dark:text-amber-300">โรคประจำตัว: {s.chronicDiseases.join(', ')}</p> : null}
            </div>
          )}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. MOBILE LMS CLASSROOM & LESSONS TAB                                      */
/* -------------------------------------------------------------------------- */

interface MobileLmsTabProps {
  activeSchool: School;
  currentRole: UserRole;
  lang: AppLanguage;
  scopedCourses: Course[];
  lessons: Lesson[];
  ownStudent?: Student;
  currentPersonId?: string;
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  onSaveLesson?: (lesson: Lesson) => Promise<void>;
  onBackHome: () => void;
}

export const MobileLmsTab: React.FC<MobileLmsTabProps> = ({
  activeSchool,
  currentRole,
  lang,
  scopedCourses,
  lessons,
  ownStudent,
  currentPersonId,
  onCompleteLesson,
  onSaveLesson,
  onBackHome,
}) => {
  const isStaff = ['teacher', 'admin', 'super_admin'].includes(currentRole);
  const [selectedCourseId, setSelectedCourseId] = useState(scopedCourses[0]?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [titleTh, setTitleTh] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeCourse = scopedCourses.find((c) => c.id === selectedCourseId) || scopedCourses[0];
  const courseLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.courseId === activeCourse?.id)
        .slice()
        .sort((a, b) => a.chapterNumber - b.chapterNumber),
    [lessons, activeCourse?.id]
  );

  const studentKey = ownStudent?.id || currentPersonId || '';
  const selectedLesson = courseLessons.find((l) => l.id === selectedLessonId) || null;

  const handleSaveNewLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !onSaveLesson || !titleTh.trim()) return;
    setBusy(true);
    try {
      await onSaveLesson({
        id: `lesson-${crypto.randomUUID()}`,
        schoolId: activeSchool.id,
        courseId: activeCourse.id,
        chapterNumber: Math.max(0, ...courseLessons.map((l) => l.chapterNumber)) + 1,
        titleTh: titleTh.trim(),
        titleEn: titleTh.trim(),
        durationMinutes: Math.max(1, Number(durationMinutes) || 15),
        videoUrl: videoUrl.trim() || undefined,
        content: content.trim(),
        materials: [],
        completedByStudentIds: [],
      });
      setTitleTh('');
      setContent('');
      setVideoUrl('');
      setShowCreateForm(false);
      setToast('บันทึกบทเรียนใหม่เรียบร้อยแล้ว');
      window.setTimeout(() => setToast(null), 2600);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkComplete = async (lessonId: string) => {
    if (!onCompleteLesson) return;
    setBusy(true);
    try {
      await onCompleteLesson(lessonId);
      setToast('บันทึกความคืบหน้าบทเรียนแล้ว');
      window.setTimeout(() => setToast(null), 2400);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (selectedLesson ? setSelectedLessonId(null) : onBackHome())}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-text)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{selectedLesson ? 'กลับรายการบทเรียน' : lang === 'th' ? 'กลับหน้าหลัก' : 'Back'}</span>
        </button>
        <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">
          {lang === 'th' ? 'ห้องเรียน & บทเรียน LMS' : 'LMS Classroom'}
        </h2>
      </div>

      {toast && (
        <div role="status" className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {!selectedLesson && (
        <>
          <div className="flex items-center gap-2">
            <select
              value={activeCourse?.id || ''}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex-1 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-title)]"
            >
              {scopedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.titleTh}
                </option>
              ))}
            </select>
            {isStaff && onSaveLesson && activeCourse && (
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className="min-h-[44px] px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มบท</span>
              </button>
            )}
          </div>

          {showCreateForm && isStaff && (
            <form onSubmit={handleSaveNewLesson} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-2.5 text-xs">
              <input
                type="text"
                value={titleTh}
                onChange={(e) => setTitleTh(e.target.value)}
                placeholder="ชื่อบทเรียน (ภาษาไทย)"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="นาที"
                  className="min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] font-mono"
                />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="ลิงก์วิดีโอ (ถ้ามี)"
                  className="col-span-2 min-h-[44px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
                />
              </div>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="สรุปเนื้อหาบทเรียน..."
                className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[44px] rounded-xl bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'กำลังบันทึก...' : 'บันทึกบทเรียน'}
              </button>
            </form>
          )}

          {courseLessons.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-1">
              <BookOpen className="w-7 h-7 mx-auto opacity-50" />
              <p>ยังไม่มีบทเรียนในรายวิชานี้</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {courseLessons.map((lesson) => {
                const done = studentKey ? lesson.completedByStudentIds.includes(studentKey) : false;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="w-full p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] text-left space-y-1 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      <span>บทที่ {lesson.chapterNumber} · {lesson.durationMinutes} นาที</span>
                      {done && (
                        <StatusBadge status="complete" size="xs" label="เรียนจบแล้ว" />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-text-title)]">{lesson.titleTh}</h3>
                    {lesson.content && (
                      <p className="text-xs text-[var(--color-text-body)] line-clamp-2">{lesson.content}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedLesson && (
        <article className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] space-y-3 text-xs">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--color-primary-text)] tabular-nums">
              {activeCourse?.code} · บทที่ {selectedLesson.chapterNumber} · {selectedLesson.durationMinutes} นาที
            </p>
            <h3 className="text-base font-extrabold text-[var(--color-text-title)]">{selectedLesson.titleTh}</h3>
          </div>

          {selectedLesson.videoUrl && (
            <a
              href={selectedLesson.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-light)] text-[var(--color-primary-text)] font-bold flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span>เปิดวิดีโอประกอบการเรียน</span>
              </span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <div className="text-sm leading-relaxed text-[var(--color-text-body)] whitespace-pre-wrap">
            {selectedLesson.content || 'ไม่มีรายละเอียดเนื้อหา'}
          </div>

          {selectedLesson.materials?.length > 0 && (
            <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
              <p className="font-bold text-[var(--color-text-title)]">เอกสารประกอบ</p>
              {selectedLesson.materials.map((m, i) => (
                <a
                  key={`${m.name}-${i}`}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 text-xs font-semibold text-[var(--color-primary-text)]"
                >
                  <span className="truncate">{m.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ))}
            </div>
          )}

          {!isStaff && onCompleteLesson && (
            <button
              type="button"
              disabled={busy || Boolean(studentKey && selectedLesson.completedByStudentIds.includes(studentKey))}
              onClick={() => void handleMarkComplete(selectedLesson.id)}
              className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {studentKey && selectedLesson.completedByStudentIds.includes(studentKey)
                  ? 'เรียนจบบทนี้แล้ว'
                  : 'บันทึกว่าเรียนจบบทนี้'}
              </span>
            </button>
          )}
        </article>
      )}
    </div>
  );
};
