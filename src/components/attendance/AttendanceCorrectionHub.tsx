import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileEdit,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AttendanceCheckType,
  AttendanceCorrectionRequest,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceUserType,
  AuthUser,
  Course,
  PeriodAttendanceRecord,
  Student,
  Teacher,
  UserRole,
} from '../../types';
import { getLocalDateString } from '../../lib/date';
import {
  buildCorrectedPeriodRecord,
  createCorrectionRequest,
  getCorrectionIssueLabelTh,
  getCorrectionScopeLabelTh,
  getCorrectionStageLabelTh,
  loadAttendanceCorrections,
  resolveStudentHomeroomTeacher,
  reviewCorrectionRequest,
} from '../../lib/attendanceCorrections';
import { resolveOwnStudent, resolveOwnTeacher } from '../../lib/attendanceScope';
import { sendEduVerseNotification } from '../../lib/pushNotifications';
import { PagedList } from '../PagedList';

export interface CorrectionPrefillSeed {
  targetScope?: AttendanceCorrectionRequest['targetScope'];
  issueType?: AttendanceCorrectionRequest['issueType'];
  date?: string;
  originalTime?: string;
  courseId?: string;
  periodNumber?: number;
  requesterId?: string;
}

interface AttendanceCorrectionHubProps {
  schoolId: string;
  currentUser: AuthUser | null;
  currentRole: UserRole;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  attendance: AttendanceRecord[];
  periodAttendance: PeriodAttendanceRecord[];
  onRecordAttendance: (
    studentId: string,
    status: AttendanceStatus,
    remarks: string,
    method?: AttendanceRecord['checkinMethod'],
    extra?: {
      recordType?: AttendanceCheckType;
      photoUrl?: string;
      location?: AttendanceRecord['location'];
      userType?: AttendanceUserType;
      teacherId?: string;
      userName?: string;
      userRole?: string;
      userAvatar?: string;
      userDepartmentOrRoom?: string;
      date?: string;
      time?: string;
      recordId?: string;
      photoStoragePath?: string;
      recordedBy?: string;
      recordedByRole?: string;
      confirmedByHomeroom?: boolean;
      confirmedByTeacherName?: string;
      correctionRequestId?: string;
    }
  ) => void;
  onRecordPeriodAttendance?: (records: PeriodAttendanceRecord[]) => void;
  prefillSeed?: CorrectionPrefillSeed | null;
  onClearPrefill?: () => void;
  showHomeroomMissingConfirm?: boolean;
  embeddedMobile?: boolean;
}

export const AttendanceCorrectionHub: React.FC<AttendanceCorrectionHubProps> = ({
  schoolId,
  currentUser,
  currentRole,
  students,
  teachers,
  courses,
  attendance,
  onRecordAttendance,
  onRecordPeriodAttendance,
  prefillSeed,
  onClearPrefill,
  showHomeroomMissingConfirm = true,
  embeddedMobile = false,
}) => {
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
  const isTeacher = currentRole === 'teacher';
  const isStaff = isAdmin || isTeacher;
  const ownStudent = resolveOwnStudent(currentUser, students);
  const ownTeacher = resolveOwnTeacher(currentUser, teachers);

  const todayStr = getLocalDateString();
  const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>(() =>
    loadAttendanceCorrections(schoolId)
  );
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Missing gate scan confirmation state (Homeroom Teacher / Admin)
  const [confirmDate, setConfirmDate] = useState<string>(todayStr);
  const [missingTab, setMissingTab] = useState<'missing_in' | 'missing_out'>('missing_in');
  const [homeroomRoomFilter, setHomeroomRoomFilter] = useState<string>(() => {
    if (ownTeacher?.homeroomClasses && ownTeacher.homeroomClasses.length > 0) {
      return ownTeacher.homeroomClasses[0];
    }
    return 'all';
  });

  // Request Form State
  const [showRequestForm, setShowRequestForm] = useState<boolean>(Boolean(prefillSeed));
  const [targetRequesterId, setTargetRequesterId] = useState<string>(() => {
    if (prefillSeed?.requesterId) return prefillSeed.requesterId;
    if (ownStudent) return ownStudent.id;
    return students[0]?.id || ownTeacher?.id || currentUser?.id || '';
  });
  const [targetScope, setTargetScope] = useState<AttendanceCorrectionRequest['targetScope']>(
    prefillSeed?.targetScope || 'gate_checkin'
  );
  const [issueType, setIssueType] = useState<AttendanceCorrectionRequest['issueType']>(
    prefillSeed?.issueType || 'forgot_checkin'
  );
  const [reqDate, setReqDate] = useState<string>(prefillSeed?.date || todayStr);
  const [reqTime, setReqTime] = useState<string>('07:55');
  const [reqOriginalTime, setReqOriginalTime] = useState<string>(prefillSeed?.originalTime || '');
  const [reqStatus, setReqStatus] = useState<AttendanceCorrectionRequest['requestedStatus']>('present');
  const [reqCourseId, setReqCourseId] = useState<string>(prefillSeed?.courseId || courses[0]?.id || '');
  const [reqPeriodNum, setReqPeriodNum] = useState<number>(prefillSeed?.periodNumber || 1);
  const [reqReason, setReqReason] = useState<string>('');

  // Approval Queue Filters & Reviewer Remarks
  const [stageFilter, setStageFilter] = useState<
    'all' | 'pending_homeroom' | 'pending_admin' | 'completed'
  >('all');
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    setRequests(loadAttendanceCorrections(schoolId));
  }, [schoolId]);

  useEffect(() => {
    if (!prefillSeed) return;
    setShowRequestForm(true);
    if (prefillSeed.targetScope) setTargetScope(prefillSeed.targetScope);
    if (prefillSeed.issueType) setIssueType(prefillSeed.issueType);
    if (prefillSeed.date) setReqDate(prefillSeed.date);
    if (prefillSeed.originalTime !== undefined) setReqOriginalTime(prefillSeed.originalTime);
    if (prefillSeed.courseId) setReqCourseId(prefillSeed.courseId);
    if (prefillSeed.periodNumber) setReqPeriodNum(prefillSeed.periodNumber);
    if (prefillSeed.requesterId) setTargetRequesterId(prefillSeed.requesterId);
  }, [prefillSeed]);

  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    students.forEach((s) => {
      if (s.room?.trim()) rooms.add(s.room.trim());
    });
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  const missingGateStudents = useMemo(() => {
    const scoped =
      homeroomRoomFilter === 'all'
        ? students
        : students.filter((s) => (s.room || '').trim() === homeroomRoomFilter);
    const checkedInIds = new Set<string>();
    const checkedOutIds = new Set<string>();
    for (const rec of attendance) {
      if (rec.date !== confirmDate || rec.userType === 'teacher') continue;
      if (rec.recordType === 'check_out') {
        checkedOutIds.add(rec.studentId);
      } else {
        checkedInIds.add(rec.studentId);
      }
    }
    if (missingTab === 'missing_in') {
      return scoped.filter((s) => !checkedInIds.has(s.id));
    }
    return scoped.filter((s) => checkedInIds.has(s.id) && !checkedOutIds.has(s.id));
  }, [students, attendance, confirmDate, homeroomRoomFilter, missingTab]);

  const handleHomeroomQuickConfirm = (student: Student, checkType: AttendanceCheckType) => {
    const teacherName =
      ownTeacher?.fullNameTh || currentUser?.fullNameTh || currentUser?.fullNameEn || 'ครูประจำชั้น';
    const actionLabel = checkType === 'check_in' ? 'เข้าโรงเรียน' : 'ออกโรงเรียน';
    onRecordAttendance(
      student.id,
      'present',
      `ครูประจำชั้นยืนยัน${actionLabel} (กรณีลืมสแกน) โดย ${teacherName}`,
      'teacher_proxy',
      {
        recordType: checkType,
        userType: 'student',
        userName: `${student.firstNameTh} ${student.lastNameTh}`,
        userRole: `นักเรียน (${student.gradeLevel} ${student.room})`,
        userAvatar: student.avatarUrl,
        userDepartmentOrRoom: student.room,
        date: confirmDate,
        recordedBy: teacherName,
        recordedByRole: currentRole,
        confirmedByHomeroom: true,
        confirmedByTeacherName: teacherName,
      }
    );

    sendEduVerseNotification({
      title: `ครูประจำชั้นยืนยัน${actionLabel}: ${student.firstNameTh} ${student.lastNameTh}`,
      body: `${teacherName} ยืนยันการ${actionLabel}วันที่ ${confirmDate} (ห้อง ${student.room || '-'}) เรียบร้อยแล้ว`,
      category: 'attendance',
      priority: 'normal',
      schoolId,
      targetStudentIds: [student.id],
      targetRoles: ['student', 'parent', 'teacher', 'admin'],
    }).catch(() => {});

    setNotice({
      type: 'ok',
      text: `ยืนยัน${actionLabel}ให้ ${student.firstNameTh} ${student.lastNameTh} และส่งแจ้งเตือนสถานะแล้ว`,
    });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const resolvedRequesterStudent = useMemo(() => {
    if (!isStaff) return ownStudent;
    return students.find((s) => s.id === targetRequesterId) || ownStudent || students[0];
  }, [isStaff, ownStudent, students, targetRequesterId]);

  const homeroomApprover = useMemo(
    () => resolveStudentHomeroomTeacher(resolvedRequesterStudent, teachers),
    [resolvedRequesterStudent, teachers]
  );

  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqReason.trim()) {
      setNotice({ type: 'err', text: 'กรุณาระบุเหตุผลประกอบคำขอแก้ไขเวลา' });
      return;
    }

    const isStudentRequester = !isStaff || Boolean(resolvedRequesterStudent);
    const requesterId =
      isStudentRequester && resolvedRequesterStudent
        ? resolvedRequesterStudent.id
        : ownTeacher?.id || currentUser?.id || 'usr-self';
    const requesterName =
      isStudentRequester && resolvedRequesterStudent
        ? `${resolvedRequesterStudent.firstNameTh} ${resolvedRequesterStudent.lastNameTh}`
        : currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ใช้งาน';
    const requesterRole: 'student' | 'teacher' =
      isStudentRequester && resolvedRequesterStudent ? 'student' : 'teacher';
    const selectedCourseObj = courses.find((c) => c.id === reqCourseId);

    const created = createCorrectionRequest({
      schoolId,
      requesterId,
      requesterName,
      requesterRole,
      requesterCode:
        requesterRole === 'student'
          ? resolvedRequesterStudent?.studentIdNumber
          : ownTeacher?.teacherIdNumber,
      departmentOrRoom:
        requesterRole === 'student'
          ? `${resolvedRequesterStudent?.gradeLevel || ''} ${resolvedRequesterStudent?.room || ''}`.trim()
          : ownTeacher?.department,
      targetScope,
      issueType,
      date: reqDate,
      originalTime: reqOriginalTime.trim() || undefined,
      requestedTime: reqTime,
      requestedStatus: reqStatus,
      courseId:
        targetScope === 'period_checkin' || targetScope === 'period_checkout'
          ? selectedCourseObj?.id
          : undefined,
      courseCode:
        targetScope === 'period_checkin' || targetScope === 'period_checkout'
          ? selectedCourseObj?.code
          : undefined,
      periodNumber:
        targetScope === 'period_checkin' || targetScope === 'period_checkout'
          ? reqPeriodNum
          : undefined,
      reason: reqReason.trim(),
      homeroomTeacherId: homeroomApprover?.id,
      homeroomTeacherName:
        homeroomApprover?.fullNameTh ||
        resolvedRequesterStudent?.advisorName ||
        'ครูประจำชั้น / หัวหน้าสายชั้น',
    });

    setRequests((prev) => [created, ...prev]);
    setReqReason('');
    setShowRequestForm(false);
    onClearPrefill?.();
    setNotice({
      type: 'ok',
      text: `ส่งคำขอแก้ไขเวลา (${getCorrectionScopeLabelTh(created.targetScope)} -> ${created.requestedTime} น.) เข้าสู่ลำดับชั้นการอนุมัติแล้ว`,
    });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handleReview = (req: AttendanceCorrectionRequest, decision: 'approve' | 'reject') => {
    const reviewerName =
      ownTeacher?.fullNameTh || currentUser?.fullNameTh || currentUser?.fullNameEn || 'ผู้ตรวจสอบ';
    const result = reviewCorrectionRequest({
      schoolId,
      requestId: req.id,
      reviewerRole: currentRole,
      reviewerName,
      decision,
      remarks: reviewRemarks[req.id],
    });
    if (result.error || !result.updated) {
      setNotice({ type: 'err', text: result.error || 'ไม่สามารถดำเนินการคำขอนี้ได้' });
      return;
    }
    setRequests(result.all);

    if (result.updated.stage === 'approved') {
      const updated = result.updated;
      if (updated.targetScope === 'gate_checkin' || updated.targetScope === 'gate_checkout') {
        const stu = students.find((s) => s.id === updated.requesterId);
        onRecordAttendance(
          updated.requesterId,
          updated.requestedStatus === 'late' ? 'late' : 'present',
          `อนุมัติปรับเวลาตามลำดับชั้น (${updated.requestedTime} น.) · ${updated.reason}`,
          'teacher_proxy',
          {
            recordType: updated.targetScope === 'gate_checkout' ? 'check_out' : 'check_in',
            userType: updated.requesterRole,
            teacherId: updated.requesterRole === 'teacher' ? updated.requesterId : undefined,
            userName: updated.requesterName,
            userRole: stu
              ? `นักเรียน (${stu.gradeLevel} ${stu.room})`
              : updated.departmentOrRoom || 'บุคลากร',
            userAvatar: stu?.avatarUrl,
            userDepartmentOrRoom: stu?.room || updated.departmentOrRoom,
            date: updated.date,
            time: updated.requestedTime,
            recordedBy: reviewerName,
            recordedByRole: currentRole,
            confirmedByHomeroom: true,
            confirmedByTeacherName: updated.homeroomVerifiedBy || updated.homeroomTeacherName,
            correctionRequestId: updated.id,
          }
        );
      } else if (
        (updated.targetScope === 'period_checkin' || updated.targetScope === 'period_checkout') &&
        onRecordPeriodAttendance
      ) {
        const correctedPeriodRec = buildCorrectedPeriodRecord({
          req: updated,
          courses,
          approverName: reviewerName,
        });
        onRecordPeriodAttendance([correctedPeriodRec]);
      }
      setNotice({
        type: 'ok',
        text: `อนุมัติขั้นสุดท้ายและอัปเดตเวลาเช็คชื่อให้ ${updated.requesterName} เป็น ${updated.requestedTime} น. แล้ว`,
      });
    } else if (result.updated.stage === 'pending_admin') {
      setNotice({
        type: 'ok',
        text: `รับรองขั้นที่ 1 (ครูประจำชั้น) แล้ว ส่งต่อผู้บริหาร/ฝ่ายวิชาการอนุมัติขั้นสุดท้าย`,
      });
    } else {
      setNotice({
        type: 'err',
        text: `ปฏิเสธคำขอแก้ไขเวลาของ ${result.updated.requesterName} แล้ว`,
      });
    }
    window.setTimeout(() => setNotice(null), 5000);
  };

  const scopedRequests = useMemo(() => {
    if (isStaff) return requests;
    const myIds = new Set(
      [currentUser?.id, currentUser?.studentRecordId, ownStudent?.id].filter(Boolean) as string[]
    );
    return requests.filter((r) => myIds.has(r.requesterId));
  }, [requests, isStaff, currentUser?.id, currentUser?.studentRecordId, ownStudent?.id]);

  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((r) => {
      if (stageFilter === 'all') return true;
      if (stageFilter === 'completed') return r.stage === 'approved' || r.stage === 'rejected';
      return r.stage === stageFilter;
    });
  }, [scopedRequests, stageFilter]);

  return (
    <div className={embeddedMobile ? 'flex-1 min-h-0 overflow-y-auto space-y-3 p-0.5 pb-4' : 'space-y-4'}>
      {notice && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            notice.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
          }`}
        >
          <span className="flex items-center gap-2">
            {notice.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-300" />
            )}
            <span>{notice.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. HOMEROOM TEACHER MISSING CHECK-IN / CHECK-OUT CONFIRMATION */}
      {showHomeroomMissingConfirm && isStaff && (
        <div className="saas-card">
          <div className="saas-card-header">
            <div className="min-w-0">
              <h3 className="type-section-title flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>ครูประจำชั้นยืนยันเข้า-ออกโรงเรียน (กรณีนักเรียนลืมสแกน)</span>
              </h3>
              <p className="type-meta mt-0.5">
                ตรวจรายชื่อนักเรียนที่ยังไม่สแกนเข้าหรือลืมสแกนออก แล้วกดยืนยันพร้อมส่งแจ้งเตือนผู้ปกครองทันที
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                aria-label="เลือกห้องเรียน"
                value={homeroomRoomFilter}
                onChange={(e) => setHomeroomRoomFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)]"
              >
                <option value="all">ทุกห้อง ({students.length})</option>
                {availableRooms.map((rm) => (
                  <option key={rm} value={rm}>
                    ห้อง {rm}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label="วันที่ตรวจสอบ"
                value={confirmDate}
                onChange={(e) => setConfirmDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs tabular-nums text-[var(--color-text-title)]"
              />
            </div>
          </div>

          <div className="saas-card-body space-y-3">
            <div className="seg-tab-group w-fit">
              <button
                type="button"
                data-active={missingTab === 'missing_in'}
                onClick={() => setMissingTab('missing_in')}
                className="seg-tab-btn flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ยังไม่สแกนเข้า</span>
              </button>
              <button
                type="button"
                data-active={missingTab === 'missing_out'}
                onClick={() => setMissingTab('missing_out')}
                className="seg-tab-btn flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ยังไม่สแกนออก</span>
              </button>
            </div>

            {missingGateStudents.length === 0 ? (
              <p className="type-meta py-4 text-center text-emerald-700 dark:text-emerald-300 font-semibold">
                {missingTab === 'missing_in'
                  ? 'นักเรียนในกลุ่มที่เลือกสแกนเข้าโรงเรียนครบทุกคนแล้ว ✓'
                  : 'ไม่พบนักเรียนที่ค้างการสแกนออกโรงเรียนในวันที่เลือก ✓'}
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                <PagedList
                  items={missingGateStudents}
                  pageSize={5}
                  renderItem={(stu) => (
                    <div
                      key={stu.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={stu.avatarUrl}
                          alt={stu.firstNameTh}
                          className="w-9 h-9 rounded-lg object-cover border border-[var(--color-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="type-card-title truncate">
                            {stu.firstNameTh} {stu.lastNameTh}
                          </p>
                          <p className="type-meta font-mono truncate">
                            {stu.studentIdNumber} · {stu.gradeLevel} {stu.room}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleHomeroomQuickConfirm(
                            stu,
                            missingTab === 'missing_in' ? 'check_in' : 'check_out'
                          )
                        }
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>
                          {missingTab === 'missing_in' ? 'ครูยืนยันเข้า' : 'ครูยืนยันออก'}
                        </span>
                      </button>
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REQUEST TIME CORRECTION + HIERARCHICAL APPROVAL QUEUE */}
      <div className="saas-card">
        <div className="saas-card-header">
          <div className="min-w-0">
            <h3 className="type-section-title flex items-center gap-1.5">
              <FileEdit className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
              <span>คำขอแก้ไขปรับปรุงเวลา (อนุมัติตามลำดับชั้น)</span>
            </h3>
            <p className="type-meta mt-0.5">
              สำหรับผู้มาสาย ลืมสแกนเข้า-ออกโรงเรียน หรือคาบเรียน · ขั้น 1 ครูประจำชั้น → ขั้น 2 ผู้บริหาร/วิชาการ
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRequestForm((v) => !v)}
            className="btn-action-primary min-h-[40px] px-3.5 py-2 shrink-0"
          >
            {showRequestForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showRequestForm ? 'ซ่อนฟอร์ม' : 'ขอแก้ไขปรับปรุงเวลา'}</span>
          </button>
        </div>

        <div className="saas-card-body space-y-4">
          {showRequestForm && (
            <form
              onSubmit={handleSubmitCorrection}
              className="p-3.5 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>ยื่นคำขอแก้ไขเวลาเข้า-ออก</span>
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-primary-text)]">
                  ผู้อนุมัติขั้นที่ 1: {homeroomApprover?.fullNameTh || resolvedRequesterStudent?.advisorName || 'ครูประจำชั้น'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {isStaff && students.length > 0 && (
                  <div>
                    <label className="type-meta font-semibold">ยื่นคำขอสำหรับ</label>
                    <select
                      value={targetRequesterId}
                      onChange={(e) => setTargetRequesterId(e.target.value)}
                      className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                    >
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.studentIdNumber} · {st.firstNameTh} {st.lastNameTh} ({st.room})
                        </option>
                      ))}
                      {ownTeacher && (
                        <option value={ownTeacher.id}>
                          บัญชีฉัน · {ownTeacher.fullNameTh} (ครู)
                        </option>
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label className="type-meta font-semibold">ประเภทเวลาที่ขอแก้ไข</label>
                  <select
                    value={targetScope}
                    onChange={(e) =>
                      setTargetScope(e.target.value as AttendanceCorrectionRequest['targetScope'])
                    }
                    className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                  >
                    <option value="gate_checkin">เข้าโรงเรียน (ประตู)</option>
                    <option value="gate_checkout">ออกโรงเรียน (ประตู)</option>
                    <option value="period_checkin">เข้าคาบเรียน (รายวิชา)</option>
                    <option value="period_checkout">ออกคาบเรียน (รายวิชา)</option>
                  </select>
                </div>

                <div>
                  <label className="type-meta font-semibold">สาเหตุ</label>
                  <select
                    value={issueType}
                    onChange={(e) =>
                      setIssueType(e.target.value as AttendanceCorrectionRequest['issueType'])
                    }
                    className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                  >
                    <option value="forgot_checkin">ลืมสแกนเข้า</option>
                    <option value="forgot_checkout">ลืมสแกนออก</option>
                    <option value="late_arrival">มาสายมีเหตุจำเป็น</option>
                    <option value="time_mismatch">เวลาสแกนคลาดเคลื่อน</option>
                  </select>
                </div>

                <div>
                  <label className="type-meta font-semibold">วันที่</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] tabular-nums"
                  />
                </div>

                <div>
                  <label className="type-meta font-semibold">เวลาจริงที่ขอปรับแก้</label>
                  <input
                    type="time"
                    value={reqTime}
                    onChange={(e) => setReqTime(e.target.value)}
                    required
                    className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="type-meta font-semibold">สถานะที่ขอรับรอง</label>
                  <select
                    value={reqStatus}
                    onChange={(e) =>
                      setReqStatus(e.target.value as AttendanceCorrectionRequest['requestedStatus'])
                    }
                    className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                  >
                    <option value="present">เข้าเรียนตรงเวลา / ปกติ</option>
                    <option value="late">มาสาย (รับรองเหตุผล)</option>
                    <option value="excused">มีเหตุจำเป็น / ลา</option>
                  </select>
                </div>

                {(targetScope === 'period_checkin' || targetScope === 'period_checkout') && (
                  <>
                    <div>
                      <label className="type-meta font-semibold">รายวิชา</label>
                      <select
                        value={reqCourseId}
                        onChange={(e) => setReqCourseId(e.target.value)}
                        className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} {c.titleTh}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="type-meta font-semibold">คาบที่</label>
                      <select
                        value={reqPeriodNum}
                        onChange={(e) => setReqPeriodNum(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)]"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                          <option key={p} value={p}>
                            คาบที่ {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="type-meta font-semibold">
                  เหตุผลประกอบการขอปรับปรุงเวลา <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="เช่น รถประจำทางเสียถึงโรงเรียน 08:12 น. / โทรศัพท์แบตหมดจึงลืมสแกนออกคาบที่ 3"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs text-[var(--color-text-title)]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    onClearPrefill?.();
                  }}
                  className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-semibold text-[var(--color-text-body)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn-action-primary min-h-[40px] px-4 py-2 text-xs"
                >
                  ส่งคำขอแก้ไขเวลา
                </button>
              </div>
            </form>
          )}

          {/* Stage filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="seg-tab-group overflow-x-auto no-scrollbar max-w-full">
              {(
                [
                  ['all', `ทั้งหมด (${scopedRequests.length})`],
                  [
                    'pending_homeroom',
                    `ขั้น 1 รอครู (${scopedRequests.filter((r) => r.stage === 'pending_homeroom').length})`,
                  ],
                  [
                    'pending_admin',
                    `ขั้น 2 รอผู้บริหาร (${scopedRequests.filter((r) => r.stage === 'pending_admin').length})`,
                  ],
                  [
                    'completed',
                    `เสร็จสิ้น (${scopedRequests.filter((r) => r.stage === 'approved' || r.stage === 'rejected').length})`,
                  ],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-active={stageFilter === key}
                  onClick={() => setStageFilter(key)}
                  className="seg-tab-btn"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <p className="type-meta py-6 text-center">
              ยังไม่มีคำขอแก้ไขปรับปรุงเวลาในหมวดนี้ — กดปุ่ม &quot;ขอแก้ไขปรับปรุงเวลา&quot; เพื่อสร้างคำขอใหม่
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              <PagedList
                items={filteredRequests}
                pageSize={5}
                renderItem={(req) => {
                  const canApproveStep1 = isStaff && req.stage === 'pending_homeroom';
                  const canApproveStep2 = isAdmin && req.stage === 'pending_admin';
                  return (
                    <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="type-card-title">{req.requesterName}</span>
                            {req.departmentOrRoom && (
                              <span className="type-meta">· {req.departmentOrRoom}</span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-title)]">
                              {getCorrectionScopeLabelTh(req.targetScope)}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)]">
                              · {getCorrectionIssueLabelTh(req.issueType)}
                            </span>
                          </div>
                          <p className="type-meta tabular-nums mt-0.5">
                            วันที่ {req.date}
                            {req.courseCode ? ` · ${req.courseCode} คาบ ${req.periodNumber}` : ''}
                            {req.originalTime ? ` · เวลาเดิม ${req.originalTime} น.` : ''} → ขอปรับเป็น{' '}
                            <strong className="text-[var(--color-primary-text)] font-mono">
                              {req.requestedTime} น.
                            </strong>
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold shrink-0 ${
                            req.stage === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : req.stage === 'rejected'
                                ? 'text-rose-700 dark:text-rose-300'
                                : req.stage === 'pending_admin'
                                  ? 'text-sky-700 dark:text-sky-300'
                                  : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{getCorrectionStageLabelTh(req.stage)}</span>
                        </span>
                      </div>

                      <p className="type-body text-xs bg-[var(--color-card-subtle)] px-3 py-2 rounded-lg border border-[var(--color-border)]">
                        &ldquo;{req.reason}&rdquo;
                      </p>

                      {/* 2-Stage Hierarchical Stepper */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                            req.homeroomVerifiedAt
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <span>
                            1. {req.homeroomVerifiedBy || req.homeroomTeacherName || 'ครูประจำชั้น'}
                          </span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                            req.stage === 'approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : req.stage === 'rejected'
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : req.stage === 'pending_admin'
                                  ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                          }`}
                        >
                          <span>
                            2. {req.adminApprovedBy || 'ผู้บริหาร / ฝ่ายวิชาการ'}
                          </span>
                        </span>
                      </div>

                      {(canApproveStep1 || canApproveStep2) && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="หมายเหตุผู้อนุมัติ (ถ้ามี)..."
                            value={reviewRemarks[req.id] || ''}
                            onChange={(e) =>
                              setReviewRemarks((prev) => ({ ...prev, [req.id]: e.target.value }))
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)]"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleReview(req, 'approve')}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                {canApproveStep1
                                  ? 'รับรองขั้นที่ 1 → ส่งผู้บริหาร'
                                  : 'อนุมัติขั้นสุดท้าย + ปรับเวลา'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReview(req, 'reject')}
                              className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ไม่อนุมัติ</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
