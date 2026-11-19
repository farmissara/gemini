import {
  AuthUser,
  Course,
  LeaveRequest,
  LeaveStatus,
  LeaveSubjectApproval,
  Student,
  Teacher,
  TimetableSlot,
} from '../types';

const DUAL_LEAVE_STORAGE_PREFIX = 'eduverse_leave_dual_approval_v1_';

export type LeaveApprovalScope = 'homeroom' | 'subject' | 'both';

interface DualApprovalCacheEntry {
  homeroomTeacherName?: string;
  homeroomApprovalStatus?: LeaveStatus;
  homeroomApprovedBy?: string;
  homeroomApprovedAt?: string;
  homeroomRemarks?: string;
  subjectTeacherNames?: string[];
  subjectApprovals?: LeaveSubjectApproval[];
}

function normalizeRoomToken(value?: string | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^ห้อง\s*/i, '')
    .replace(/^room\s*/i, '')
    .replace(/\s+/g, '');
}

function normalizeName(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function loadDualApprovalCacheMap(schoolId: string): Record<string, DualApprovalCacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`${DUAL_LEAVE_STORAGE_PREFIX}${schoolId || 'default'}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLeaveDualApprovalCache(
  schoolId: string,
  leaveId: string,
  entry: DualApprovalCacheEntry
): void {
  if (typeof window === 'undefined' || !leaveId) return;
  try {
    const map = loadDualApprovalCacheMap(schoolId);
    map[leaveId] = entry;
    window.localStorage.setItem(
      `${DUAL_LEAVE_STORAGE_PREFIX}${schoolId || 'default'}`,
      JSON.stringify(map)
    );
  } catch {
    // ignore storage errors
  }
}

export function resolveStudentLeaveApprovers(params: {
  student?: Student;
  teachers: Teacher[];
  courses: Course[];
  timetableSlots?: TimetableSlot[];
  courseId?: string;
}): {
  homeroomTeacherName: string;
  subjectTeacherNames: string[];
  subjectApprovals: LeaveSubjectApproval[];
} {
  const { student, teachers, courses, timetableSlots = [], courseId } = params;
  const studentRoomToken = normalizeRoomToken(student?.room);
  const studentGradeLower = (student?.gradeLevel || '').trim().toLowerCase();

  // 1. Resolve Homeroom Teacher(s)
  const matchedHomerooms = teachers.filter((t) => {
    if (!student) return false;
    return (t.homeroomClasses || []).some((cls) => {
      const clsToken = normalizeRoomToken(cls);
      const clsLower = cls.trim().toLowerCase();
      return (
        (studentRoomToken && clsToken && (clsToken.includes(studentRoomToken) || studentRoomToken.includes(clsToken))) ||
        (studentGradeLower && studentRoomToken && clsLower.includes(studentGradeLower) && clsLower.includes(studentRoomToken))
      );
    });
  });

  const homeroomTeacherName =
    matchedHomerooms.length > 0
      ? matchedHomerooms.map((t) => t.fullNameTh).join(', ')
      : student?.room
        ? `ครูประจำชั้นห้อง ${student.room}`
        : 'ครูประจำชั้น';

  // 2. Resolve Subject Teachers (from courses + timetable slots)
  const subjectMap = new Map<string, LeaveSubjectApproval>();

  const registerSubject = (
    teacherName: string,
    courseObj?: { id?: string; code?: string; titleTh?: string; titleEn?: string }
  ) => {
    const cleanTeacher = (teacherName || '').trim();
    if (!cleanTeacher) return;
    const matchedTeacher = teachers.find(
      (t) => normalizeName(t.fullNameTh) === normalizeName(cleanTeacher)
    );
    const key = `${normalizeName(cleanTeacher)}::${(courseObj?.code || '').toUpperCase()}`;
    if (!subjectMap.has(key)) {
      subjectMap.set(key, {
        teacherId: matchedTeacher?.id,
        teacherName: cleanTeacher,
        courseId: courseObj?.id,
        courseCode: courseObj?.code,
        courseTitle: courseObj?.titleTh || courseObj?.titleEn,
        status: 'pending',
      });
    }
  };

  if (courseId) {
    const targetCourse = courses.find((c) => c.id === courseId);
    if (targetCourse?.teacherName) {
      registerSubject(targetCourse.teacherName, targetCourse);
    }
  } else {
    courses.forEach((course) => {
      const enrolledMatch = Boolean(student && course.enrolledStudentIds?.includes(student.id));
      const roomMatch = Boolean(
        studentRoomToken &&
          course.room &&
          (normalizeRoomToken(course.room) === studentRoomToken ||
            normalizeRoomToken(course.room).includes(studentRoomToken))
      );
      if (enrolledMatch || roomMatch) {
        registerSubject(course.teacherName, course);
      }
    });

    timetableSlots.forEach((slot) => {
      const slotRoomToken = normalizeRoomToken(slot.classRoom);
      const roomMatch = Boolean(
        studentRoomToken &&
          slotRoomToken &&
          (slotRoomToken === studentRoomToken ||
            slotRoomToken.includes(studentRoomToken) ||
            studentRoomToken.includes(slotRoomToken))
      );
      if (roomMatch) {
        if (slot.teacherName) {
          registerSubject(slot.teacherName, {
            id: slot.courseId,
            code: slot.courseCode,
            titleTh: slot.courseTitleTh,
            titleEn: slot.courseTitleEn,
          });
        }
        if (slot.coTeacherName) {
          registerSubject(slot.coTeacherName, {
            id: slot.courseId,
            code: slot.courseCode,
            titleTh: slot.courseTitleTh,
            titleEn: slot.courseTitleEn,
          });
        }
      }
    });
  }

  // Fallback if no subject courses are linked yet
  if (subjectMap.size === 0) {
    const fallbackCourses = courses.slice(0, 3);
    fallbackCourses.forEach((c) => {
      if (c.teacherName) registerSubject(c.teacherName, c);
    });
  }

  const subjectApprovals = Array.from(subjectMap.values()).slice(0, 8);
  const subjectTeacherNames = Array.from(new Set(subjectApprovals.map((a) => a.teacherName)));

  return {
    homeroomTeacherName,
    subjectTeacherNames,
    subjectApprovals,
  };
}

export function enrichLeaveRequestForDualApproval(params: {
  schoolId: string;
  req: LeaveRequest;
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  timetableSlots?: TimetableSlot[];
}): LeaveRequest {
  const { schoolId, req, students, teachers, courses, timetableSlots = [] } = params;
  if (req.userRole !== 'student') {
    return req;
  }

  const cached = loadDualApprovalCacheMap(schoolId)[req.id];
  if (cached) {
    return {
      ...req,
      homeroomTeacherName: req.homeroomTeacherName || cached.homeroomTeacherName,
      homeroomApprovalStatus: req.homeroomApprovalStatus || cached.homeroomApprovalStatus,
      homeroomApprovedBy: req.homeroomApprovedBy || cached.homeroomApprovedBy,
      homeroomApprovedAt: req.homeroomApprovedAt || cached.homeroomApprovedAt,
      homeroomRemarks: req.homeroomRemarks || cached.homeroomRemarks,
      subjectTeacherNames: req.subjectTeacherNames?.length
        ? req.subjectTeacherNames
        : cached.subjectTeacherNames,
      subjectApprovals: req.subjectApprovals?.length
        ? req.subjectApprovals
        : cached.subjectApprovals,
    };
  }

  const student = students.find(
    (s) =>
      s.id === req.userId ||
      (s.studentIdNumber && s.studentIdNumber === req.userId) ||
      `${s.firstNameTh} ${s.lastNameTh}`.trim() === req.userName.trim()
  );

  const resolved = resolveStudentLeaveApprovers({
    student,
    teachers,
    courses,
    timetableSlots,
    courseId: req.courseId,
  });

  const baseStatus: LeaveStatus = req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'pending';
  const hydratedApprovals =
    req.subjectApprovals && req.subjectApprovals.length > 0
      ? req.subjectApprovals
      : resolved.subjectApprovals.map((item) => ({
          ...item,
          status: baseStatus,
        }));

  const ccList = [
    `ครูประจำชั้น: ${req.homeroomTeacherName || resolved.homeroomTeacherName}`,
    resolved.subjectTeacherNames.length > 0
      ? `ครูประจำวิชา: ${resolved.subjectTeacherNames.join(', ')}`
      : 'ครูประจำวิชา',
  ].join(' | ');

  return {
    ...req,
    homeroomTeacherName: req.homeroomTeacherName || resolved.homeroomTeacherName,
    homeroomApprovalStatus: req.homeroomApprovalStatus || baseStatus,
    subjectTeacherNames: req.subjectTeacherNames?.length
      ? req.subjectTeacherNames
      : resolved.subjectTeacherNames,
    subjectApprovals: hydratedApprovals,
    ccEmailsOrRoles: req.ccEmailsOrRoles || ccList,
  };
}

export function applyDualLeaveDecision(params: {
  schoolId: string;
  req: LeaveRequest;
  decision: LeaveStatus;
  approverName: string;
  scope: LeaveApprovalScope;
  remarks?: string;
}): LeaveRequest {
  const { schoolId, req, decision, approverName, scope, remarks } = params;
  const nowStr = new Date().toLocaleString('th-TH');

  // Teacher leave requests use single-stage approval
  if (req.userRole !== 'student') {
    return {
      ...req,
      status: decision,
      approvedBy: approverName,
      approvalRemarks: remarks || req.approvalRemarks,
      updatedAt: new Date().toISOString(),
    };
  }

  let nextHomeroomStatus: LeaveStatus = req.homeroomApprovalStatus || 'pending';
  let nextHomeroomBy = req.homeroomApprovedBy;
  let nextHomeroomAt = req.homeroomApprovedAt;
  let nextHomeroomRemarks = req.homeroomRemarks;

  let nextSubjectApprovals: LeaveSubjectApproval[] = (req.subjectApprovals || []).map((item) => ({
    ...item,
  }));

  if (scope === 'homeroom' || scope === 'both') {
    nextHomeroomStatus = decision;
    nextHomeroomBy = approverName;
    nextHomeroomAt = nowStr;
    if (remarks) nextHomeroomRemarks = remarks;
  }

  if (scope === 'subject' || scope === 'both') {
    if (nextSubjectApprovals.length === 0) {
      nextSubjectApprovals = [
        {
          teacherName: approverName,
          status: decision,
          approvedAt: nowStr,
          remarks,
        },
      ];
    } else if (scope === 'both') {
      nextSubjectApprovals = nextSubjectApprovals.map((item) => ({
        ...item,
        status: decision,
        approvedAt: nowStr,
        remarks: remarks || item.remarks,
      }));
    } else {
      const normalizedApprover = normalizeName(approverName);
      const matchedIndexes = nextSubjectApprovals
        .map((item, idx) => (normalizeName(item.teacherName) === normalizedApprover ? idx : -1))
        .filter((idx) => idx >= 0);

      if (matchedIndexes.length > 0) {
        matchedIndexes.forEach((idx) => {
          nextSubjectApprovals[idx] = {
            ...nextSubjectApprovals[idx],
            status: decision,
            approvedAt: nowStr,
            remarks: remarks || nextSubjectApprovals[idx].remarks,
          };
        });
      } else {
        // Teacher/admin approving on behalf of pending subject teachers
        nextSubjectApprovals = nextSubjectApprovals.map((item) =>
          item.status === 'pending'
            ? {
                ...item,
                status: decision,
                approvedAt: nowStr,
                remarks: remarks || `ดำเนินการโดย ${approverName}`,
              }
            : item
        );
      }
    }
  }

  const anyRejected =
    nextHomeroomStatus === 'rejected' ||
    nextSubjectApprovals.some((item) => item.status === 'rejected');
  const allSubjectsApproved =
    nextSubjectApprovals.length === 0 ||
    nextSubjectApprovals.every((item) => item.status === 'approved');
  const overallStatus: LeaveStatus = anyRejected
    ? 'rejected'
    : nextHomeroomStatus === 'approved' && allSubjectsApproved
      ? 'approved'
      : 'pending';

  const summaryParts: string[] = [
    `ครูประจำชั้น: ${
      nextHomeroomStatus === 'approved'
        ? `อนุมัติ (${nextHomeroomBy || approverName})`
        : nextHomeroomStatus === 'rejected'
          ? 'ไม่อนุมัติ'
          : 'รออนุมัติ'
    }`,
    `ครูประจำวิชา: ${nextSubjectApprovals.filter((s) => s.status === 'approved').length}/${nextSubjectApprovals.length} วิชา`,
  ];
  if (remarks) summaryParts.push(`หมายเหตุ: ${remarks}`);

  const updated: LeaveRequest = {
    ...req,
    status: overallStatus,
    approvedBy:
      overallStatus === 'approved'
        ? `${nextHomeroomBy || approverName} & ครูประจำวิชา`
        : approverName,
    approvalRemarks: summaryParts.join(' · '),
    homeroomApprovalStatus: nextHomeroomStatus,
    homeroomApprovedBy: nextHomeroomBy,
    homeroomApprovedAt: nextHomeroomAt,
    homeroomRemarks: nextHomeroomRemarks,
    subjectApprovals: nextSubjectApprovals,
    updatedAt: new Date().toISOString(),
  };

  saveLeaveDualApprovalCache(schoolId, req.id, {
    homeroomTeacherName: updated.homeroomTeacherName,
    homeroomApprovalStatus: updated.homeroomApprovalStatus,
    homeroomApprovedBy: updated.homeroomApprovedBy,
    homeroomApprovedAt: updated.homeroomApprovedAt,
    homeroomRemarks: updated.homeroomRemarks,
    subjectTeacherNames: updated.subjectTeacherNames,
    subjectApprovals: updated.subjectApprovals,
  });

  return updated;
}

export function detectTeacherApprovalRoleForLeave(
  req: LeaveRequest,
  currentUser: AuthUser | null | undefined,
  teachers: Teacher[]
): {
  isHomeroomApprover: boolean;
  isSubjectApprover: boolean;
  canApproveBoth: boolean;
} {
  if (!currentUser) {
    return { isHomeroomApprover: false, isSubjectApprover: false, canApproveBoth: false };
  }
  if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
    return { isHomeroomApprover: true, isSubjectApprover: true, canApproveBoth: true };
  }
  if (currentUser.role !== 'teacher') {
    return { isHomeroomApprover: false, isSubjectApprover: false, canApproveBoth: false };
  }

  const ownTeacher = teachers.find(
    (t) =>
      t.id === currentUser.id ||
      (currentUser.email && t.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      normalizeName(t.fullNameTh) === normalizeName(currentUser.fullNameTh)
  );
  const myName = normalizeName(ownTeacher?.fullNameTh || currentUser.fullNameTh);

  const isHomeroomMatch = Boolean(
    myName &&
      req.homeroomTeacherName &&
      normalizeName(req.homeroomTeacherName).includes(myName)
  );
  const isSubjectMatch = Boolean(
    myName &&
      (req.subjectApprovals || []).some(
        (item) => normalizeName(item.teacherName) === myName || (ownTeacher && item.teacherId === ownTeacher.id)
      )
  );

  // If teacher matches neither specifically (e.g. demo or unassigned), allow approving both roles cleanly
  if (!isHomeroomMatch && !isSubjectMatch) {
    return { isHomeroomApprover: true, isSubjectApprover: true, canApproveBoth: true };
  }

  return {
    isHomeroomApprover: isHomeroomMatch,
    isSubjectApprover: isSubjectMatch,
    canApproveBoth: isHomeroomMatch && isSubjectMatch,
  };
}
