import {
  Announcement,
  AttendanceRecord,
  BehaviorRecord,
  Course,
  GradeRecord,
  HomeworkSubmission,
  InfirmaryVisit,
  LeaveRequest,
  PeriodAttendanceRecord,
  SdqAssessment,
  Student,
  Teacher,
  TimetableSlot,
  TuitionInvoice,
} from '../types';

function duplicateGroupCount<T>(records: T[], keyFor: (record: T) => string): number {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const key = keyFor(record).trim().toLocaleLowerCase();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.values()].filter((count) => count > 1).length;
}

function hasDuplicateCandidate<T>(candidates: T[], existing: T[], keyFor: (record: T) => string): boolean {
  const seen = new Set(existing.map((record) => keyFor(record).trim().toLocaleLowerCase()).filter(Boolean));
  return candidates.some((record) => {
    const key = keyFor(record).trim().toLocaleLowerCase();
    if (!key) return false;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

export function getDuplicateRecordWarnings(data: {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  grades: GradeRecord[];
  invoices: TuitionInvoice[];
  timetableSlots: TimetableSlot[];
  attendance?: AttendanceRecord[];
  periodAttendance?: PeriodAttendanceRecord[];
  announcements?: Announcement[];
  behaviorRecords?: BehaviorRecord[];
  sdqAssessments?: SdqAssessment[];
  infirmaryVisits?: InfirmaryVisit[];
  homeworkSubmissions?: HomeworkSubmission[];
  leaveRequests?: LeaveRequest[];
}): string[] {
  const warnings: string[] = [];
  const addWarning = (label: string, count: number) => {
    if (count > 0) warnings.push(`${label} ซ้ำ ${count} กลุ่ม`);
  };

  addWarning('รหัสนักเรียน', duplicateGroupCount(data.students, (student) => student.studentIdNumber));
  addWarning(
    'ชื่อ-นามสกุลนักเรียน (ในโรงเรียน)',
    duplicateGroupCount(
      data.students,
      (student) => `${student.firstNameTh.trim()}|${student.lastNameTh.trim()}|${student.gradeLevel.trim()}`
    )
  );
  addWarning(
    'เลขประจำตัวประชาชนนักเรียน',
    duplicateGroupCount(
      data.students.filter((student) => student.nationalId),
      (student) => student.nationalId || ''
    )
  );
  addWarning('รหัสบุคลากร', duplicateGroupCount(data.teachers, (teacher) => teacher.teacherIdNumber));
  addWarning(
    'ชื่อ-นามสกุลบุคลากร',
    duplicateGroupCount(data.teachers, (teacher) => teacher.fullNameTh.trim())
  );
  addWarning(
    'อีเมลบุคลากร',
    duplicateGroupCount(
      data.teachers.filter((teacher) => teacher.email),
      (teacher) => teacher.email
    )
  );
  addWarning(
    'รหัสวิชาในปี/ภาคเรียนเดียวกัน',
    duplicateGroupCount(
      data.courses,
      (course) =>
        course.code.trim()
          ? `${course.code.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
          : ''
    )
  );
  addWarning(
    'ผลการเรียนของนักเรียนในรายวิชา/ภาคเรียนเดียวกัน',
    duplicateGroupCount(
      data.grades,
      (grade) => `${grade.studentId}|${grade.courseId}|${grade.academicYear}|${grade.semester}`
    )
  );
  addWarning('เลขที่ใบแจ้งหนี้', duplicateGroupCount(data.invoices, (invoice) => invoice.invoiceNumber));
  addWarning(
    'ใบแจ้งหนี้นักเรียนรายการเดียวกันในภาคเรียนเดียว',
    duplicateGroupCount(
      data.invoices,
      (invoice) => `${invoice.studentId}|${invoice.semester}|${(invoice.items[0]?.title || '').trim()}`
    )
  );
  addWarning(
    'รายการตารางสอนห้องเดียวกันในวัน/คาบเดียวกัน',
    duplicateGroupCount(
      data.timetableSlots,
      (slot) => `${slot.classRoom}|${slot.dayOfWeek}|${slot.periodNumber}`
    )
  );
  if (data.attendance?.length) {
    addWarning(
      'บันทึกเช็คชื่อรายวันของนักเรียนซ้ำในวันเดียวกัน',
      duplicateGroupCount(
        data.attendance,
        (att) => `${att.studentId}|${att.date}|${att.recordType || 'check_in'}`
      )
    );
  }
  if (data.periodAttendance?.length) {
    addWarning(
      'บันทึกเช็คชื่อรายคาบซ้ำ',
      duplicateGroupCount(
        data.periodAttendance,
        (pa) => `${pa.studentId}|${pa.courseId}|${pa.date}|${pa.periodNumber}|${pa.recordType || 'check_in'}`
      )
    );
  }
  if (data.announcements?.length) {
    addWarning(
      'หัวข้อประกาศซ้ำ',
      duplicateGroupCount(data.announcements, (ann) => `${ann.title.trim()}|${ann.targetAudience}`)
    );
  }
  if (data.behaviorRecords?.length) {
    addWarning(
      'บันทึกพฤติกรรมนักเรียนซ้ำในวัน/หัวข้อเดียวกัน',
      duplicateGroupCount(
        data.behaviorRecords,
        (rec) => `${rec.studentId}|${rec.date}|${rec.type}|${rec.category.trim()}`
      )
    );
  }
  if (data.sdqAssessments?.length) {
    addWarning(
      'ผลประเมิน SDQ นักเรียนซ้ำในภาคเรียนเดียวกัน',
      duplicateGroupCount(
        data.sdqAssessments,
        (sdq) => `${sdq.studentId}|${sdq.academicYear}|${sdq.semester}`
      )
    );
  }
  if (data.infirmaryVisits?.length) {
    addWarning(
      'การบันทึกเข้าห้องพยาบาลซ้ำ (นักเรียน/วัน/เวลา/อาการเดียวกัน)',
      duplicateGroupCount(
        data.infirmaryVisits,
        (visit) => `${visit.studentId}|${visit.visitDate}|${visit.visitTime}|${visit.symptoms.trim()}`
      )
    );
  }
  if (data.homeworkSubmissions?.length) {
    addWarning(
      'รายการส่งการบ้านของนักเรียนซ้ำในงานเดียวกัน',
      duplicateGroupCount(
        data.homeworkSubmissions,
        (sub) => `${sub.studentId}|${sub.assignmentId}|${sub.courseCode}`
      )
    );
  }
  if (data.leaveRequests?.length) {
    addWarning(
      'คำขอลาของนักเรียนซ้ำในช่วงวันเดียวกัน',
      duplicateGroupCount(
        data.leaveRequests,
        (req) => `${req.userId}|${req.startDate}|${req.endDate}|${req.leaveType}`
      )
    );
  }

  return warnings;
}

export function getDuplicateIdWarnings(data: Record<string, Array<{ id: string }>>): string[] {
  const labels: Record<string, string> = {
    students: 'ระเบียนนักเรียน',
    teachers: 'ระเบียนบุคลากร',
    courses: 'ระเบียนรายวิชา',
    grades: 'ระเบียนผลการเรียน',
    attendance: 'ระเบียนเวลาเรียน',
    invoices: 'ระเบียนใบแจ้งหนี้',
    announcements: 'ระเบียนประกาศ',
    lessons: 'ระเบียนบทเรียน',
    assignments: 'ระเบียนงานที่มอบหมาย',
    questions: 'ระเบียนข้อสอบ',
    periodAttendance: 'ระเบียนเช็คชื่อรายคาบ',
    portfolioItems: 'ระเบียนแฟ้มสะสมผลงาน',
    timetableSlots: 'ระเบียนตารางสอน',
    behaviorRecords: 'ระเบียนพฤติกรรม',
    sdqAssessments: 'ระเบียนประเมิน SDQ',
    infirmaryVisits: 'ระเบียนห้องพยาบาล',
    homeworkSubmissions: 'ระเบียนการส่งการบ้าน',
  };
  return Object.entries(data).flatMap(([collection, records]) => {
    const duplicates = duplicateGroupCount(records, (record) => record.id);
    return duplicates > 0 ? [`${labels[collection] || collection} ซ้ำ ${duplicates} กลุ่ม`] : [];
  });
}

export function getStudentDuplicateReasons(
  candidates: Student[],
  existing: Student[],
  excludeIds: string[] = []
): string[] {
  const existingRecords = existing.filter((student) => !excludeIds.includes(student.id));
  const warnings: string[] = [];
  if (hasDuplicateCandidate(candidates, existingRecords, (student) => student.studentIdNumber)) {
    warnings.push('รหัสนักเรียนซ้ำ');
  }
  if (
    hasDuplicateCandidate(
      candidates,
      existingRecords,
      (student) => `${student.firstNameTh.trim()}|${student.lastNameTh.trim()}`
    )
  ) {
    warnings.push('ชื่อ-นามสกุลซ้ำกับนักเรียนที่มีอยู่แล้ว');
  }
  if (hasDuplicateCandidate(candidates, existingRecords, (student) => student.nationalId || '')) {
    warnings.push('เลขประจำตัวประชาชนซ้ำ');
  }
  return warnings;
}

export function getTeacherDuplicateReasons(
  candidates: Teacher[],
  existing: Teacher[],
  excludeIds: string[] = []
): string[] {
  const existingRecords = existing.filter((teacher) => !excludeIds.includes(teacher.id));
  const warnings: string[] = [];
  if (hasDuplicateCandidate(candidates, existingRecords, (teacher) => teacher.teacherIdNumber)) {
    warnings.push('รหัสบุคลากรซ้ำ');
  }
  if (
    hasDuplicateCandidate(
      candidates,
      existingRecords,
      (teacher) => teacher.fullNameTh.trim()
    )
  ) {
    warnings.push('ชื่อ-นามสกุลบุคลากรซ้ำ');
  }
  if (
    hasDuplicateCandidate(
      candidates.filter((teacher) => teacher.email),
      existingRecords.filter((teacher) => teacher.email),
      (teacher) => teacher.email
    )
  ) {
    warnings.push('อีเมลบุคลากรซ้ำ');
  }
  return warnings;
}

export function getCourseDuplicateReasons(
  candidates: Course[],
  existing: Course[],
  excludeIds: string[] = []
): string[] {
  const existingRecords = existing.filter((course) => !excludeIds.includes(course.id));
  const warnings: string[] = [];
  const codeKeyFor = (course: Course) =>
    course.code.trim()
      ? `${course.code.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
      : '';
  if (hasDuplicateCandidate(candidates, existingRecords, codeKeyFor)) {
    warnings.push('รหัสวิชาซ้ำในปี/ภาคเรียนเดียวกัน');
  }
  const titleKeyFor = (course: Course) =>
    course.titleTh.trim()
      ? `${course.titleTh.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
      : '';
  if (hasDuplicateCandidate(candidates, existingRecords, titleKeyFor)) {
    warnings.push('ชื่อรายวิชาซ้ำในปี/ภาคเรียนเดียวกัน');
  }
  return warnings;
}

export function getCourseDuplicateExtraIds(courses: Course[]): string[] {
  const seen = new Set<string>();
  const extraIds: string[] = [];
  courses.forEach((course) => {
    const key = course.code.trim()
      ? `${course.code.trim().toLowerCase()}|${course.academicYear.trim().toLowerCase()}|${course.semester.trim().toLowerCase()}`
      : '';
    if (!key) return;
    if (seen.has(key)) {
      extraIds.push(course.id);
    } else {
      seen.add(key);
    }
  });
  return extraIds;
}

export function getGradeDuplicateReasons(candidates: GradeRecord[], existing: GradeRecord[]): string[] {
  const keyFor = (grade: GradeRecord) =>
    `${grade.studentId}|${grade.courseId}|${grade.academicYear}|${grade.semester}`;
  return hasDuplicateCandidate(candidates, existing, keyFor)
    ? ['ผลการเรียนซ้ำสำหรับนักเรียน/รายวิชา/ภาคเรียนเดียวกัน']
    : [];
}

export function getTimetableDuplicateReasons(
  candidate: Pick<TimetableSlot, 'classRoom' | 'dayOfWeek' | 'periodNumber' | 'teacherName' | 'room'>,
  existing: TimetableSlot[],
  excludeId?: string
): string[] {
  const pool = excludeId ? existing.filter((s) => s.id !== excludeId) : existing;
  const reasons: string[] = [];
  if (
    pool.some(
      (s) =>
        s.classRoom.trim().toLowerCase() === candidate.classRoom.trim().toLowerCase() &&
        s.dayOfWeek === candidate.dayOfWeek &&
        s.periodNumber === candidate.periodNumber
    )
  ) {
    reasons.push(`ห้อง ${candidate.classRoom} มีคาบเรียนในวัน/คาบที่ ${candidate.periodNumber} อยู่แล้ว`);
  }
  if (
    candidate.teacherName.trim() &&
    pool.some(
      (s) =>
        s.teacherName.trim().toLowerCase() === candidate.teacherName.trim().toLowerCase() &&
        s.dayOfWeek === candidate.dayOfWeek &&
        s.periodNumber === candidate.periodNumber
    )
  ) {
    reasons.push(`ผู้สอน "${candidate.teacherName}" มีตารางสอนซ้อนในวันและคาบเดียวกัน`);
  }
  if (
    candidate.room.trim() &&
    pool.some(
      (s) =>
        s.room.trim().toLowerCase() === candidate.room.trim().toLowerCase() &&
        s.dayOfWeek === candidate.dayOfWeek &&
        s.periodNumber === candidate.periodNumber
    )
  ) {
    reasons.push(`ห้องเรียน/สถานที่ "${candidate.room}" ถูกใช้งานซ้อนในวันและคาบเดียวกัน`);
  }
  return reasons;
}

export function getBehaviorDuplicateReasons(
  candidate: Pick<BehaviorRecord, 'studentId' | 'date' | 'type' | 'category'>,
  existing: BehaviorRecord[]
): string[] {
  const matched = existing.some(
    (r) =>
      r.studentId === candidate.studentId &&
      r.date === candidate.date &&
      r.type === candidate.type &&
      r.category.trim().toLowerCase() === candidate.category.trim().toLowerCase()
  );
  return matched ? ['มีบันทึกพฤติกรรมนักเรียนคนนี้ในวันที่และหัวข้อเดียวกันแล้ว'] : [];
}

export function getSdqDuplicateReasons(
  candidate: Pick<SdqAssessment, 'studentId' | 'academicYear' | 'semester'>,
  existing: SdqAssessment[]
): string[] {
  const matched = existing.some(
    (s) =>
      s.studentId === candidate.studentId &&
      s.academicYear === candidate.academicYear &&
      s.semester === candidate.semester
  );
  return matched ? ['นักเรียนคนนี้มีแบบประเมิน SDQ ในภาคเรียน/ปีการศึกษานี้แล้ว'] : [];
}

export function getInfirmaryDuplicateReasons(
  candidate: Pick<InfirmaryVisit, 'studentId' | 'visitDate' | 'symptoms'>,
  existing: InfirmaryVisit[]
): string[] {
  const sameDay = existing.some(
    (v) =>
      v.studentId === candidate.studentId &&
      v.visitDate === candidate.visitDate &&
      v.symptoms.trim().toLowerCase() === candidate.symptoms.trim().toLowerCase()
  );
  return sameDay ? ['มีบันทึกการเข้าห้องพยาบาลของนักเรียนคนนี้ด้วยอาการเดียวกันในวันนี้แล้ว'] : [];
}

export function getInvoiceDuplicateReasons(
  candidate: { studentId: string; invoiceNumber: string; semester: string; title: string },
  existing: TuitionInvoice[]
): string[] {
  const reasons: string[] = [];
  if (
    candidate.invoiceNumber.trim() &&
    existing.some((inv) => inv.invoiceNumber.trim().toLowerCase() === candidate.invoiceNumber.trim().toLowerCase())
  ) {
    reasons.push('เลขที่ใบแจ้งหนี้ซ้ำในระบบ');
  }
  if (
    existing.some(
      (inv) =>
        inv.studentId === candidate.studentId &&
        inv.semester.trim().toLowerCase() === candidate.semester.trim().toLowerCase() &&
        inv.items.some((item) => item.title.trim().toLowerCase() === candidate.title.trim().toLowerCase())
    )
  ) {
    reasons.push('นักเรียนมีใบแจ้งหนี้หัวข้อและภาคเรียนเดียวกันนี้อยู่แล้ว');
  }
  return reasons;
}

export function getAnnouncementDuplicateReasons(
  candidate: Pick<Announcement, 'title' | 'targetAudience'>,
  existing: Announcement[]
): string[] {
  const matched = existing.some(
    (ann) =>
      ann.title.trim().toLowerCase() === candidate.title.trim().toLowerCase() &&
      ann.targetAudience === candidate.targetAudience
  );
  return matched ? ['มีประกาศหัวข้อและกลุ่มเป้าหมายเดียวกันอยู่ในระบบแล้ว'] : [];
}

export function getHomeworkDuplicateReasons(
  candidate: Pick<HomeworkSubmission, 'studentId' | 'assignmentId' | 'courseCode'>,
  existing: HomeworkSubmission[]
): string[] {
  const matched = existing.some(
    (sub) =>
      sub.studentId === candidate.studentId &&
      sub.assignmentId === candidate.assignmentId &&
      sub.courseCode.trim().toLowerCase() === candidate.courseCode.trim().toLowerCase()
  );
  return matched ? ['นักเรียนส่งการบ้านรายการนี้ในรายวิชานี้แล้ว'] : [];
}

export function getAttendanceDuplicateReasons(
  candidate: { studentId: string; date: string; recordType?: 'check_in' | 'check_out' },
  existing: AttendanceRecord[]
): string[] {
  const matched = existing.some(
    (att) =>
      att.studentId === candidate.studentId &&
      att.date === candidate.date &&
      (att.recordType || 'check_in') === (candidate.recordType || 'check_in')
  );
  return matched ? ['นักเรียนมีบันทึกเช็คชื่อในวันและประเภทเดียวกันแล้ว'] : [];
}
