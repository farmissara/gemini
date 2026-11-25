import type {
  AttendanceCorrectionRequest,
  AttendanceRecord,
  Course,
  PeriodAttendanceRecord,
  Student,
  Teacher,
  UserRole,
} from '../types';
import { sendEduVerseNotification } from './pushNotifications';

export interface PeriodFlexConfig {
  graceMinutes: number; // default 15 mins grace for check-in; 999 = open flexible window
  allowFlexibleCheckout: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export const DEFAULT_PERIOD_FLEX_CONFIG: PeriodFlexConfig = {
  graceMinutes: 15,
  allowFlexibleCheckout: true,
};

const CORRECTION_STORAGE_PREFIX = 'eduverse_attendance_corrections_v1';
const PERIOD_FLEX_STORAGE_PREFIX = 'eduverse_period_flex_v1';

function getCorrectionStorageKey(schoolId: string): string {
  return `${CORRECTION_STORAGE_PREFIX}_${schoolId || 'default'}`;
}

function getFlexStorageKey(schoolId: string): string {
  return `${PERIOD_FLEX_STORAGE_PREFIX}_${schoolId || 'default'}`;
}

export function loadPeriodFlexConfig(schoolId: string, courseId?: string): PeriodFlexConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_PERIOD_FLEX_CONFIG;
  try {
    const raw = localStorage.getItem(getFlexStorageKey(schoolId));
    if (!raw) return DEFAULT_PERIOD_FLEX_CONFIG;
    const map = JSON.parse(raw) as Record<string, PeriodFlexConfig>;
    return (
      (courseId && map[courseId]) ||
      map.__default__ ||
      DEFAULT_PERIOD_FLEX_CONFIG
    );
  } catch {
    return DEFAULT_PERIOD_FLEX_CONFIG;
  }
}

export function savePeriodFlexConfig(
  schoolId: string,
  courseId: string | undefined,
  config: PeriodFlexConfig
): PeriodFlexConfig {
  if (typeof localStorage === 'undefined') return config;
  try {
    const key = getFlexStorageKey(schoolId);
    const raw = localStorage.getItem(key);
    const map = raw ? (JSON.parse(raw) as Record<string, PeriodFlexConfig>) : {};
    map[courseId || '__default__'] = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
  return config;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = /(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

export interface PeriodTimingEvaluation {
  status: 'present' | 'late';
  timingTagTh: string;
  minutesDelta: number;
}

/**
 * Evaluate flexible period check-in or check-out timing against a slot ("08:30 - 09:20")
 * with configurable teacher grace minutes (999 = completely flexible open timing).
 */
export function evaluatePeriodTimingStatus(params: {
  timeSlot: string;
  checkType: 'check_in' | 'check_out';
  actualMinutes: number;
  graceMinutes: number;
  allowFlexibleCheckout?: boolean;
}): PeriodTimingEvaluation {
  const [startStr, endStr] = params.timeSlot.split('-').map((s) => s.trim());
  const startM = parseTimeToMinutes(startStr);
  const endM = parseTimeToMinutes(endStr);

  if (startM === null || endM === null) {
    return { status: 'present', timingTagTh: 'เช็คชื่อตามเวลาที่กำหนด', minutesDelta: 0 };
  }

  if (params.checkType === 'check_in') {
    const diffFromStart = params.actualMinutes - startM;
    if (params.graceMinutes >= 999) {
      return {
        status: 'present',
        timingTagTh: diffFromStart > 0 ? `เข้าเรียนยืดหยุ่น (+${diffFromStart} น.)` : 'เข้าเรียนตรงเวลา',
        minutesDelta: diffFromStart,
      };
    }
    if (diffFromStart <= Math.max(0, params.graceMinutes)) {
      return {
        status: 'present',
        timingTagTh:
          diffFromStart > 0
            ? `เข้าเรียนภายในช่วงผ่อนผัน (+${diffFromStart}/${params.graceMinutes} น.)`
            : 'เข้าเรียนตรงเวลา',
        minutesDelta: diffFromStart,
      };
    }
    return {
      status: 'late',
      timingTagTh: `เข้าเรียนสาย (+${diffFromStart} น. · เกินผ่อนผัน ${params.graceMinutes} น.)`,
      minutesDelta: diffFromStart,
    };
  }

  // check_out evaluation
  const diffFromEnd = params.actualMinutes - endM;
  if (diffFromEnd < -10) {
    return {
      status: 'present',
      timingTagTh:
        params.allowFlexibleCheckout !== false
          ? `ออกคาบก่อนเวลา (ยืดหยุ่น ${Math.abs(diffFromEnd)} น.)`
          : `ออกก่อนเวลา ${Math.abs(diffFromEnd)} น.`,
      minutesDelta: diffFromEnd,
    };
  }
  if (diffFromEnd > 10) {
    return {
      status: 'present',
      timingTagTh: `ออกคาบช้า / อยู่ต่อ (+${diffFromEnd} น.)`,
      minutesDelta: diffFromEnd,
    };
  }
  return {
    status: 'present',
    timingTagTh: 'เช็คชื่อออกคาบตรงเวลา',
    minutesDelta: diffFromEnd,
  };
}

export function resolveStudentHomeroomTeacher(
  student: Student | undefined,
  teachers: Teacher[]
): Teacher | undefined {
  if (!student) return undefined;
  if (student.advisorName) {
    const byAdvisor = teachers.find(
      (t) => t.fullNameTh.trim() === student.advisorName?.trim()
    );
    if (byAdvisor) return byAdvisor;
  }
  const roomKey = (student.room || '').trim().toLowerCase();
  if (!roomKey) return undefined;
  return teachers.find((t) =>
    (t.homeroomClasses || []).some((cls) => cls.trim().toLowerCase() === roomKey)
  );
}

export function loadAttendanceCorrections(schoolId: string): AttendanceCorrectionRequest[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getCorrectionStorageKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AttendanceCorrectionRequest[]) : [];
  } catch {
    return [];
  }
}

export function persistAttendanceCorrections(
  schoolId: string,
  list: AttendanceCorrectionRequest[]
): AttendanceCorrectionRequest[] {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getCorrectionStorageKey(schoolId), JSON.stringify(list.slice(0, 200)));
    } catch {
      // Ignore quota issues
    }
  }
  return list;
}

export function createCorrectionRequest(params: {
  schoolId: string;
  requesterId: string;
  requesterName: string;
  requesterRole: 'student' | 'teacher';
  requesterCode?: string;
  departmentOrRoom?: string;
  targetScope: AttendanceCorrectionRequest['targetScope'];
  issueType: AttendanceCorrectionRequest['issueType'];
  date: string;
  originalTime?: string;
  requestedTime: string;
  requestedStatus: AttendanceCorrectionRequest['requestedStatus'];
  courseId?: string;
  courseCode?: string;
  periodNumber?: number;
  reason: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
}): AttendanceCorrectionRequest {
  const newReq: AttendanceCorrectionRequest = {
    id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId: params.schoolId,
    requesterId: params.requesterId,
    requesterName: params.requesterName,
    requesterRole: params.requesterRole,
    requesterCode: params.requesterCode,
    departmentOrRoom: params.departmentOrRoom,
    targetScope: params.targetScope,
    issueType: params.issueType,
    date: params.date,
    originalTime: params.originalTime,
    requestedTime: params.requestedTime,
    requestedStatus: params.requestedStatus,
    courseId: params.courseId,
    courseCode: params.courseCode,
    periodNumber: params.periodNumber,
    reason: params.reason.trim(),
    stage: 'pending_homeroom',
    homeroomTeacherId: params.homeroomTeacherId,
    homeroomTeacherName: params.homeroomTeacherName || 'ครูประจำชั้น / หัวหน้าสายชั้น',
    createdAt: new Date().toISOString(),
  };

  const existing = loadAttendanceCorrections(params.schoolId);
  const next = [newReq, ...existing];
  persistAttendanceCorrections(params.schoolId, next);

  const scopeLabel = getCorrectionScopeLabelTh(newReq.targetScope);
  sendEduVerseNotification({
    title: `🕒 คำขอแก้ไขเวลาเช็คชื่อใหม่: ${newReq.requesterName}`,
    body: `${scopeLabel} · ขอเวลา ${newReq.requestedTime} น. (รอ ${newReq.homeroomTeacherName} ตรวจสอบขั้นที่ 1)`,
    category: 'attendance',
    priority: 'urgent',
    schoolId: params.schoolId,
    targetUserIds: newReq.homeroomTeacherId ? [newReq.homeroomTeacherId] : undefined,
    targetRoles: ['teacher', 'admin', 'super_admin'],
    metadata: { correctionRequestId: newReq.id },
  }).catch((err) => {
    console.warn('[AttendanceCorrections] Failed to send new correction notification:', err);
  });

  return newReq;
}

export function reviewCorrectionRequest(params: {
  schoolId: string;
  requestId: string;
  reviewerRole: UserRole;
  reviewerName: string;
  decision: 'approve' | 'reject';
  remarks?: string;
}): { updated: AttendanceCorrectionRequest | null; all: AttendanceCorrectionRequest[]; error?: string } {
  const current = loadAttendanceCorrections(params.schoolId);
  const target = current.find((r) => r.id === params.requestId);
  if (!target) {
    return { updated: null, all: current, error: 'ไม่พบคำขอแก้ไขเวลานี้' };
  }

  const isAdminReviewer = params.reviewerRole === 'admin' || params.reviewerRole === 'super_admin';
  const isTeacherReviewer = params.reviewerRole === 'teacher';
  if (!isAdminReviewer && !isTeacherReviewer) {
    return { updated: null, all: current, error: 'บัญชีของคุณไม่มีสิทธิ์อนุมัติคำขอแก้ไขเวลา' };
  }

  const nowIso = new Date().toISOString();
  let nextItem: AttendanceCorrectionRequest = { ...target };

  if (params.decision === 'reject') {
    nextItem = {
      ...target,
      stage: 'rejected',
      rejectedBy: params.reviewerName,
      rejectedAt: nowIso,
      rejectReason: params.remarks?.trim() || 'ไม่อนุมัติคำขอปรับปรุงเวลา',
    };
  } else if (target.stage === 'pending_homeroom') {
    if (isAdminReviewer && !isTeacherReviewer) {
      // Admin may advance step 1 or grant hierarchical override when homeroom teacher isn't separated,
      // but keep proper Stage 1 -> Stage 2 audit trail for teachers.
      nextItem = {
        ...target,
        stage: 'pending_admin',
        homeroomVerifiedBy: params.reviewerName,
        homeroomVerifiedAt: nowIso,
        homeroomRemarks: params.remarks?.trim() || 'รับรองขั้นที่ 1 แล้ว รอฝ่ายวิชาการ/ผู้บริหารอนุมัติขั้นสุดท้าย',
      };
    } else {
      nextItem = {
        ...target,
        stage: 'pending_admin',
        homeroomVerifiedBy: params.reviewerName,
        homeroomVerifiedAt: nowIso,
        homeroomRemarks: params.remarks?.trim() || 'ครูประจำชั้นยืนยันเหตุผลและเวลาถูกต้องแล้ว',
      };
    }
  } else if (target.stage === 'pending_admin') {
    if (!isAdminReviewer) {
      return {
        updated: null,
        all: current,
        error: 'ขั้นตอนสุดท้ายต้องได้รับการอนุมัติจากผู้บริหารสถานศึกษาหรือฝ่ายวิชาการ',
      };
    }
    nextItem = {
      ...target,
      stage: 'approved',
      adminApprovedBy: params.reviewerName,
      adminApprovedAt: nowIso,
      adminRemarks: params.remarks?.trim() || 'อนุมัติปรับปรุงเวลาตามลำดับชั้นเรียบร้อยแล้ว',
    };
  }

  const nextList = current.map((r) => (r.id === target.id ? nextItem : r));
  persistAttendanceCorrections(params.schoolId, nextList);

  const title =
    nextItem.stage === 'approved'
      ? `✅ อนุมัติแก้ไขเวลาเช็คชื่อแล้ว: ${nextItem.requesterName}`
      : nextItem.stage === 'rejected'
        ? `❌ ไม่อนุมัติแก้ไขเวลา: ${nextItem.requesterName}`
        : `📋 ผ่านการรับรองขั้นที่ 1 (ครูประจำชั้น): ${nextItem.requesterName}`;
  const body =
    nextItem.stage === 'approved'
      ? `${getCorrectionScopeLabelTh(nextItem.targetScope)} ปรับเป็นเวลา ${nextItem.requestedTime} น. โดย ${params.reviewerName}`
      : nextItem.stage === 'rejected'
        ? nextItem.rejectReason || 'กรุณาติดต่อครูประจำชั้น'
        : `ครู ${params.reviewerName} ตรวจสอบแล้ว ส่งต่อผู้บริหาร/ฝ่ายวิชาการอนุมัติขั้นสุดท้าย`;

  sendEduVerseNotification({
    title,
    body,
    category: 'attendance',
    priority: 'urgent',
    schoolId: params.schoolId,
    targetUserIds: [nextItem.requesterId],
    targetStudentIds: nextItem.requesterRole === 'student' ? [nextItem.requesterId] : undefined,
    targetRoles: ['student', 'parent', 'teacher', 'admin', 'super_admin'],
    metadata: { correctionRequestId: nextItem.id, stage: nextItem.stage },
  }).catch((err) => {
    console.warn('[AttendanceCorrections] Failed to send correction review notification:', err);
  });

  return { updated: nextItem, all: nextList };
}

export function getCorrectionScopeLabelTh(scope: AttendanceCorrectionRequest['targetScope']): string {
  switch (scope) {
    case 'gate_checkin':
      return 'เวลาเข้าโรงเรียน';
    case 'gate_checkout':
      return 'เวลาออกโรงเรียน';
    case 'period_checkin':
      return 'เวลาเข้าคาบเรียน';
    case 'period_checkout':
      return 'เวลาออกคาบเรียน';
  }
}

export function getCorrectionIssueLabelTh(issue: AttendanceCorrectionRequest['issueType']): string {
  switch (issue) {
    case 'forgot_checkin':
      return 'ลืมสแกนเข้า';
    case 'forgot_checkout':
      return 'ลืมสแกนออก';
    case 'late_arrival':
      return 'มาสายมีเหตุจำเป็น';
    case 'time_mismatch':
      return 'เวลาคลาดเคลื่อน';
  }
}

export function getCorrectionStageLabelTh(stage: AttendanceCorrectionRequest['stage']): string {
  switch (stage) {
    case 'pending_homeroom':
      return 'ขั้นที่ 1: รอครูประจำชั้นตรวจสอบ';
    case 'pending_admin':
      return 'ขั้นที่ 2: รอผู้บริหาร/ฝ่ายวิชาการอนุมัติ';
    case 'approved':
      return 'อนุมัติและปรับเวลาแล้ว';
    case 'rejected':
      return 'ไม่อนุมัติ';
  }
}

export function buildCorrectedPeriodRecord(params: {
  req: AttendanceCorrectionRequest;
  courses: Course[];
  approverName: string;
}): PeriodAttendanceRecord {
  const course = params.courses.find((c) => c.id === params.req.courseId);
  const checkType = params.req.targetScope === 'period_checkout' ? 'check_out' : 'check_in';
  return {
    id: `patt-corr-${params.req.id}`,
    schoolId: params.req.schoolId,
    courseId: params.req.courseId || course?.id || 'crs-gen',
    courseCode: params.req.courseCode || course?.code || 'GEN-101',
    periodNumber: params.req.periodNumber || 1,
    timeSlot: params.req.requestedTime,
    date: params.req.date,
    studentId: params.req.requesterId,
    status: params.req.requestedStatus === 'late' ? 'late' : 'present',
    recordType: checkType,
    actualCheckInTime: checkType === 'check_in' ? params.req.requestedTime : undefined,
    actualCheckOutTime: checkType === 'check_out' ? params.req.requestedTime : undefined,
    verifiedByTeacherId: params.req.homeroomTeacherId || 'admin-approved',
    verifiedByTeacherName: params.approverName,
    checkMethod: 'teacher_proxy',
    remarks: `ปรับเวลาตามคำขออนุมัติลำดับชั้น (${params.req.requestedTime} น.) · ${params.req.reason}`,
  };
}
