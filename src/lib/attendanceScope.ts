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

export interface CurrentUserAttendanceProfile {
  targetId: string;
  userName: string;
  userRoleLabel: string;
  departmentOrRoom: string;
  avatarUrl: string;
  userType: 'student' | 'teacher';
  idNumber: string;
  isSelf: boolean;
  isLinkedToStudentRecord: boolean;
  isLinkedToTeacherRecord: boolean;
  linkedStudent?: Student;
  linkedTeacher?: Teacher;
}

export function resolveCurrentUserAttendanceProfile(
  currentUser: AuthUser | null | undefined,
  teachers: Teacher[] = [],
  students: Student[] = []
): CurrentUserAttendanceProfile {
  if (!currentUser) {
    const fallbackStudent = students[0];
    return {
      targetId: fallbackStudent?.id || 'stu-1',
      userName: fallbackStudent ? `${fallbackStudent.firstNameTh} ${fallbackStudent.lastNameTh}` : 'ผู้ใช้งานทั่วไป',
      userRoleLabel: fallbackStudent ? `นักเรียน (${fallbackStudent.gradeLevel} ห้อง ${fallbackStudent.room})` : 'นักเรียน',
      departmentOrRoom: fallbackStudent?.room || '401',
      avatarUrl: fallbackStudent?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      userType: 'student',
      idNumber: fallbackStudent?.studentIdNumber || 'STU-001',
      isSelf: false,
      isLinkedToStudentRecord: Boolean(fallbackStudent),
      isLinkedToTeacherRecord: false,
      linkedStudent: fallbackStudent,
    };
  }

  // 1. Student User
  if (currentUser.role === 'student') {
    const ownStudent = resolveOwnStudent(currentUser, students);
    const targetId = ownStudent?.id || currentUser.studentRecordId || currentUser.id;
    const userName = currentUser.fullNameTh || (ownStudent ? `${ownStudent.firstNameTh} ${ownStudent.lastNameTh}` : 'นักเรียน');
    const userRoleLabel = ownStudent
      ? `นักเรียน (${ownStudent.gradeLevel} ห้อง ${ownStudent.room})`
      : `นักเรียน (${currentUser.gradeLevel || 'ม.4'} ห้อง ${currentUser.room || '401'})`;
    const departmentOrRoom = ownStudent?.room || currentUser.room || 'ห้องเรียน';
    const avatarUrl = currentUser.avatarUrl || ownStudent?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';
    const idNumber = ownStudent?.studentIdNumber || currentUser.studentIdNumber || currentUser.id;

    return {
      targetId,
      userName,
      userRoleLabel,
      departmentOrRoom,
      avatarUrl,
      userType: 'student',
      idNumber,
      isSelf: true,
      isLinkedToStudentRecord: Boolean(ownStudent),
      isLinkedToTeacherRecord: false,
      linkedStudent: ownStudent,
    };
  }

  // 2. Teacher User
  if (currentUser.role === 'teacher') {
    const ownTeacher = resolveOwnTeacher(currentUser, teachers);
    const targetId = ownTeacher?.id || currentUser.id;
    const userName = currentUser.fullNameTh || ownTeacher?.fullNameTh || 'อาจารย์';
    const userRoleLabel = ownTeacher?.academicStanding || currentUser.academicStanding || 'ครูผู้สอน';
    const departmentOrRoom = ownTeacher?.department || currentUser.department || 'กลุ่มสาระการเรียนรู้';
    const avatarUrl = currentUser.avatarUrl || ownTeacher?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200';
    const idNumber = ownTeacher?.teacherIdNumber || currentUser.teacherIdNumber || currentUser.id;

    return {
      targetId,
      userName,
      userRoleLabel,
      departmentOrRoom,
      avatarUrl,
      userType: 'teacher',
      idNumber,
      isSelf: true,
      isLinkedToStudentRecord: false,
      isLinkedToTeacherRecord: Boolean(ownTeacher),
      linkedTeacher: ownTeacher,
    };
  }

  // 3. Super Admin & Admin User
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    const linkedTeacher = resolveOwnTeacher(currentUser, teachers);
    const targetId = currentUser.id || linkedTeacher?.id || 'adm-1';
    const userName = currentUser.fullNameTh || 'ผู้ดูแลระบบ';
    const userRoleLabel = currentUser.role === 'super_admin'
      ? 'ผู้ดูแลระบบสูงสุด (Super Admin)'
      : 'ผู้บริหาร / ผู้ดูแลระบบ (Admin)';
    const departmentOrRoom = currentUser.department || linkedTeacher?.department || 'ฝ่ายบริหารและวิชาการ';
    const avatarUrl = currentUser.avatarUrl || linkedTeacher?.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200';
    const idNumber = currentUser.teacherIdNumber || linkedTeacher?.teacherIdNumber || currentUser.id;

    return {
      targetId,
      userName,
      userRoleLabel,
      departmentOrRoom,
      avatarUrl,
      userType: 'teacher', // Stored under faculty/staff category in DB
      idNumber,
      isSelf: true,
      isLinkedToStudentRecord: false,
      isLinkedToTeacherRecord: Boolean(linkedTeacher),
      linkedTeacher,
    };
  }

  // 4. Parent User
  const ownStudent = resolveOwnStudent(currentUser, students);
  return {
    targetId: ownStudent?.id || currentUser.id,
    userName: currentUser.fullNameTh || 'ผู้ปกครอง',
    userRoleLabel: ownStudent ? `ผู้ปกครองของ ${ownStudent.firstNameTh}` : 'ผู้ปกครอง',
    departmentOrRoom: ownStudent ? `ห้อง ${ownStudent.room}` : 'ผู้ปกครอง',
    avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
    userType: 'student',
    idNumber: ownStudent?.studentIdNumber || currentUser.id,
    isSelf: true,
    isLinkedToStudentRecord: Boolean(ownStudent),
    isLinkedToTeacherRecord: false,
    linkedStudent: ownStudent,
  };
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
