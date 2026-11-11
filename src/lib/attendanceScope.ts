import { AttendanceRecord, AuthUser, LeaveRequest, PeriodAttendanceRecord, Student, Teacher } from '../types';

export function resolveOwnStudent(currentUser: AuthUser | null | undefined, students: Student[]): Student | undefined {
  if (!currentUser || students.length === 0) return undefined;

  if (currentUser.studentRecordId) {
    const linkedStudent = students.find((s) => s.id === currentUser.studentRecordId);
    if (linkedStudent) return linkedStudent;
  }

  const byId = students.find((s) => s.id === currentUser.id);
  if (byId) return byId;

  if (currentUser.studentIdNumber) {
    const targetCode = currentUser.studentIdNumber.trim().toLowerCase();
    const byStudentCode = students.find((s) => s.studentIdNumber.trim().toLowerCase() === targetCode);
    if (byStudentCode) return byStudentCode;
  }

  if (currentUser.role === 'parent' && currentUser.childrenStudentIds?.length) {
    const child = students.find((s) => currentUser.childrenStudentIds?.includes(s.id));
    if (child) return child;
  }

  const thName = (currentUser.fullNameTh || '').trim().toLocaleLowerCase();
  const enName = (currentUser.fullNameEn || '').trim().toLocaleLowerCase();
  const byName = students.find((s) => {
    const fullTh = `${s.firstNameTh} ${s.lastNameTh}`.trim().toLocaleLowerCase();
    const fullEn = `${s.firstNameEn} ${s.lastNameEn}`.trim().toLocaleLowerCase();
    return (
      (thName && thName === fullTh) ||
      (enName && enName === fullEn)
    );
  });
  if (byName) return byName;

  return undefined;
}

export function resolveOwnTeacher(currentUser: AuthUser | null | undefined, teachers: Teacher[]): Teacher | undefined {
  if (!currentUser || teachers.length === 0) return undefined;

  const byId = teachers.find((t) => t.id === currentUser.id);
  if (byId) return byId;

  if (currentUser.teacherIdNumber) {
    const code = currentUser.teacherIdNumber.trim().toLowerCase();
    const byCode = teachers.find((t) => t.teacherIdNumber.trim().toLowerCase() === code);
    if (byCode) return byCode;
  }

  if (currentUser.email) {
    const email = currentUser.email.trim().toLowerCase();
    const byEmail = teachers.find((t) => t.email?.trim().toLowerCase() === email);
    if (byEmail) return byEmail;
  }

  const thName = (currentUser.fullNameTh || '').trim().toLocaleLowerCase();
  const byName = teachers.find((t) => {
    const tName = t.fullNameTh.trim().toLocaleLowerCase();
    return thName && thName === tName;
  });
  if (byName) return byName;

  return undefined;
}

export function isRestrictedAttendanceViewer(currentUser: AuthUser | null | undefined): boolean {
  return currentUser?.role === 'student' || currentUser?.role === 'parent';
}

export function getAllowedStudentScope(
  currentUser: AuthUser | null | undefined,
  students: Student[]
): { restricted: boolean; allowedStudents: Student[]; allowedIds: Set<string>; ownStudent?: Student } {
  if (!currentUser || !isRestrictedAttendanceViewer(currentUser)) {
    return {
      restricted: false,
      allowedStudents: students,
      allowedIds: new Set(students.map((s) => s.id)),
      ownStudent: undefined,
    };
  }

  if (currentUser.role === 'parent') {
    const children = currentUser.childrenStudentIds?.length
      ? students.filter((s) => currentUser.childrenStudentIds?.includes(s.id))
      : [];
    const fallback = children.length > 0 ? children : students.slice(0, 1);
    return {
      restricted: true,
      allowedStudents: fallback,
      allowedIds: new Set([currentUser.id, ...fallback.map((s) => s.id)]),
      ownStudent: fallback[0],
    };
  }

  const ownStudent = resolveOwnStudent(currentUser, students);
  const allowedStudents = ownStudent ? [ownStudent] : [];
  const allowedIds = new Set<string>([currentUser.id]);
  if (ownStudent) {
    allowedIds.add(ownStudent.id);
    if (ownStudent.studentIdNumber) {
      allowedIds.add(ownStudent.studentIdNumber);
    }
  }
  if (currentUser.studentIdNumber) {
    allowedIds.add(currentUser.studentIdNumber);
  }

  return {
    restricted: true,
    allowedStudents,
    allowedIds,
    ownStudent,
  };
}

export function filterAttendanceForUser(
  records: AttendanceRecord[],
  currentUser: AuthUser | null | undefined,
  students: Student[]
): AttendanceRecord[] {
  const scope = getAllowedStudentScope(currentUser, students);
  if (!scope.restricted) return records;

  return records.filter((rec) => {
    if (rec.userType === 'teacher') return false;
    if (scope.allowedIds.has(rec.studentId)) return true;
    const recName = (rec.userName || '').trim().toLowerCase();
    return scope.allowedStudents.some((s) => {
      const fullTh = `${s.firstNameTh} ${s.lastNameTh}`.trim().toLowerCase();
      return recName && fullTh && recName.includes(fullTh);
    });
  });
}

export function filterLeaveRequestsForUser(
  requests: LeaveRequest[],
  currentUser: AuthUser | null | undefined,
  students: Student[]
): LeaveRequest[] {
  const scope = getAllowedStudentScope(currentUser, students);
  if (!scope.restricted) return requests;

  return requests.filter((req) => {
    if (req.userRole === 'teacher') return false;
    if (scope.allowedIds.has(req.userId)) return true;
    const reqName = (req.userName || '').trim().toLowerCase();
    return scope.allowedStudents.some((s) => {
      const fullTh = `${s.firstNameTh} ${s.lastNameTh}`.trim().toLowerCase();
      return reqName && fullTh && reqName.includes(fullTh);
    });
  });
}

export function filterPeriodAttendanceForUser(
  records: PeriodAttendanceRecord[],
  currentUser: AuthUser | null | undefined,
  students: Student[]
): PeriodAttendanceRecord[] {
  const scope = getAllowedStudentScope(currentUser, students);
  if (!scope.restricted) return records;

  return records.filter((rec) => scope.allowedIds.has(rec.studentId));
}
