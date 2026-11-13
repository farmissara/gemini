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

export type DuplicateRecordTarget =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'gradebook'
  | 'billing'
  | 'timetable'
  | 'attendance'
  | 'announcements'
  | 'behavior_sdq'
  | 'infirmary'
  | 'homework'
  | 'portfolio'
  | 'subject_labs'
  | 'central_exam_hub';

export interface DuplicateRecordMatch {
  value: string;
  records: string[];
}

export interface DuplicateRecordCheck {
  label: string;
  groups: DuplicateRecordMatch[];
}

export interface DuplicateRecordReport {
  target: DuplicateRecordTarget;
  programMode?: 'lms_classroom';
  module: string;
  guidance: string;
  checks: DuplicateRecordCheck[];
}

const DUPLICATE_REPORT_DESTINATIONS: Record<DuplicateRecordTarget, { module: string; guidance: string }> = {
  dashboard: {
    module: 'Virtual Classroom / LMS',
    guidance: 'สลับไปโหมด Virtual Classroom / LMS จากแถบด้านบน แล้วเปิดบทเรียนหรือใบงานเพื่อตรวจ ID ที่แสดงและให้ผู้ดูแลแก้ไขระเบียน',
  },
  students: {
    module: 'ทะเบียนนักเรียน',
    guidance: 'เปิดทะเบียนนักเรียน แล้วค้นหาด้วยชื่อหรือรหัสที่แสดง ตรวจข้อมูลแต่ละระเบียนและแก้ไขให้ถูกต้อง หรือคงไว้เพียงระเบียนเดียวก่อนลบรายการเกิน',
  },
  teachers: {
    module: 'บุคลากรและครู',
    guidance: 'เปิดทะเบียนบุคลากร แล้วค้นหาด้วยชื่อ รหัสบุคลากร หรืออีเมลที่แสดง ตรวจผู้ใช้และความสัมพันธ์ก่อนแก้ไขหรือลบรายการเกิน',
  },
  courses: {
    module: 'รายวิชา',
    guidance: 'เปิดรายวิชา แล้วค้นหารหัสหรือชื่อในปี/ภาคเรียนที่ระบุ ตรวจการลงทะเบียนและตารางสอนก่อนแก้ไข หรือลบเฉพาะรายการซ้ำโดยเก็บรายการที่ถูกต้องไว้',
  },
  gradebook: {
    module: 'Gradebook / ปพ.5',
    guidance: 'เปิด Gradebook / ปพ.5 เลือกนักเรียน รายวิชา ปีการศึกษา และภาคเรียนตามรายการ ตรวจผลคะแนนก่อนแก้ไขหรือลบระเบียนที่เกิน',
  },
  billing: {
    module: 'การเงินและใบแจ้งหนี้',
    guidance: 'เปิดการเงิน แล้วค้นหาเลขที่ใบแจ้งหนี้หรือชื่อนักเรียน ตรวจยอดชำระและใบเสร็จก่อนแก้ไขหรือลบ เพื่อไม่ให้กระทบประวัติการเงิน',
  },
  timetable: {
    module: 'ตารางเรียนและตารางสอน',
    guidance: 'เปิดตารางเรียนและตารางสอน แล้วเลือกห้อง วัน และคาบตามรายการ ตรวจครูและห้องสถานที่ก่อนย้ายหรือลบคาบที่ซ้ำ',
  },
  attendance: {
    module: 'เวลาเรียนและการลา',
    guidance: 'เปิดเวลาเรียน แล้วเลือกนักเรียน วันที่ และคาบ/ประเภทการเช็คชื่อตามรายการ ตรวจสถานะก่อนแก้ไขหรือลบระเบียนซ้ำ',
  },
  announcements: {
    module: 'ประกาศ',
    guidance: 'เปิดประกาศ แล้วค้นหาหัวข้อและกลุ่มเป้าหมายตามรายการ ตรวจเนื้อหาและวันเผยแพร่ก่อนแก้ไขหรือลบประกาศที่ซ้ำ',
  },
  behavior_sdq: {
    module: 'พฤติกรรมและ SDQ',
    guidance: 'เปิดพฤติกรรมและ SDQ แล้วค้นหานักเรียน วันที่/ภาคเรียน และหัวข้อที่แสดง ตรวจผู้บันทึกหรือผู้ประเมินก่อนแก้ไขหรือลบรายการเกิน',
  },
  infirmary: {
    module: 'ห้องพยาบาล',
    guidance: 'เปิดห้องพยาบาล แล้วค้นหานักเรียน วันที่ เวลา และอาการตามรายการ ตรวจรายละเอียดการรักษาก่อนแก้ไขหรือลบรายการซ้ำ',
  },
  homework: {
    module: 'การบ้าน',
    guidance: 'เปิดการบ้าน แล้วค้นหานักเรียน งาน และรายวิชาตามรายการ ตรวจไฟล์ส่งงานและคะแนนก่อนแก้ไขหรือลบรายการซ้ำ',
  },
  portfolio: {
    module: 'แฟ้มสะสมผลงาน',
    guidance: 'เปิดแฟ้มสะสมผลงาน แล้วค้นหา ID ที่แสดง ตรวจเจ้าของและรายการผลงานก่อนให้ผู้ดูแลแก้ไขระเบียน',
  },
  subject_labs: {
    module: 'บทเรียน/สื่อการเรียน',
    guidance: 'เปิดบทเรียนหรือสื่อการเรียน แล้วค้นหา ID ที่แสดง ตรวจรายการก่อนให้ผู้ดูแลแก้ไขระเบียน',
  },
  central_exam_hub: {
    module: 'คลังข้อสอบ',
    guidance: 'เปิดคลังข้อสอบ แล้วค้นหา ID ที่แสดง ตรวจชุดข้อสอบก่อนให้ผู้ดูแลแก้ไขระเบียน',
  },
};

function getDuplicateMatches<T>(
  records: T[],
  keyFor: (record: T) => string,
  valueFor: (record: T) => string,
  describe: (record: T) => string
): DuplicateRecordMatch[] {
  const groups = new Map<string, { value: string; records: string[] }>();
  records.forEach((record) => {
    const rawKey = keyFor(record).normalize('NFC').trim();
    const key = rawKey.toLocaleLowerCase();
    if (!key) return;
    const group = groups.get(key) || { value: valueFor(record), records: [] };
    group.records.push(describe(record));
    groups.set(key, group);
  });
  return [...groups.values()]
    .filter((group) => group.records.length > 1)
    .map((group) => ({ value: group.value, records: group.records }));
}

export interface DuplicateRecordData {
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
}

export function getDuplicateRecordReports(data: DuplicateRecordData): DuplicateRecordReport[] {
  const reports = new Map<DuplicateRecordTarget, DuplicateRecordReport>();
  const addCheck = (
    target: DuplicateRecordTarget,
    label: string,
    groups: DuplicateRecordMatch[]
  ) => {
    if (groups.length === 0) return;
    const destination = DUPLICATE_REPORT_DESTINATIONS[target];
    const report = reports.get(target) || {
      target,
      module: destination.module,
      guidance: destination.guidance,
      checks: [],
    };
    report.checks.push({ label, groups });
    reports.set(target, report);
  };

  const studentById = new Map(data.students.map((student) => [student.id, student]));
  const courseById = new Map(data.courses.map((course) => [course.id, course]));
  const describeStudent = (student: Student) =>
    `${student.firstNameTh} ${student.lastNameTh} · รหัส ${student.studentIdNumber} · ${student.gradeLevel}/${student.room}`;
  const describeTeacher = (teacher: Teacher) =>
    `${teacher.fullNameTh} · รหัส ${teacher.teacherIdNumber || 'ไม่ระบุ'}`;
  const describeCourse = (course: Course) =>
    `${course.code} ${course.titleTh} · ${course.academicYear}/${course.semester}`;
  const maskNationalId = (nationalId: string) =>
    nationalId.length > 4 ? `${'•'.repeat(nationalId.length - 4)}${nationalId.slice(-4)}` : nationalId;
  const dayLabels: Record<string, string> = {
    mon: 'วันจันทร์',
    tue: 'วันอังคาร',
    wed: 'วันพุธ',
    thu: 'วันพฤหัสบดี',
    fri: 'วันศุกร์',
  };
  const checkTypeLabel = (recordType?: string) => recordType === 'check_out' ? 'เช็คออก' : 'เช็คเข้า';

  addCheck('students', 'รหัสนักเรียน', getDuplicateMatches(
    data.students,
    (student) => student.studentIdNumber,
    (student) => student.studentIdNumber,
    describeStudent
  ));
  addCheck('students', 'ชื่อ-นามสกุลและระดับชั้น', getDuplicateMatches(
    data.students,
    (student) => `${student.firstNameTh.trim()}|${student.lastNameTh.trim()}|${student.gradeLevel.trim()}`,
    (student) => `${student.firstNameTh} ${student.lastNameTh} · ${student.gradeLevel}`,
    describeStudent
  ));
  addCheck('students', 'เลขประจำตัวประชาชน', getDuplicateMatches(
    data.students.filter((student) => student.nationalId),
    (student) => student.nationalId || '',
    (student) => maskNationalId(student.nationalId || ''),
    describeStudent
  ));
  addCheck('teachers', 'รหัสบุคลากร', getDuplicateMatches(
    data.teachers,
    (teacher) => teacher.teacherIdNumber,
    (teacher) => teacher.teacherIdNumber,
    describeTeacher
  ));
  addCheck('teachers', 'ชื่อบุคลากร', getDuplicateMatches(
    data.teachers,
    (teacher) => teacher.fullNameTh,
    (teacher) => teacher.fullNameTh,
    describeTeacher
  ));
  addCheck('teachers', 'อีเมลบุคลากร', getDuplicateMatches(
    data.teachers.filter((teacher) => teacher.email),
    (teacher) => teacher.email,
    (teacher) => teacher.email,
    describeTeacher
  ));
  addCheck('courses', 'รหัสวิชาในปี/ภาคเรียนเดียวกัน', getDuplicateMatches(
    data.courses,
    (course) => course.code.trim()
      ? `${course.code.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
      : '',
    (course) => `${course.code} · ${course.academicYear}/${course.semester}`,
    describeCourse
  ));
  addCheck('courses', 'ชื่อวิชาในปี/ภาคเรียนเดียวกัน', getDuplicateMatches(
    data.courses,
    (course) => course.titleTh.trim()
      ? `${course.titleTh.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
      : '',
    (course) => `${course.titleTh} · ${course.academicYear}/${course.semester}`,
    describeCourse
  ));
  addCheck('gradebook', 'ผลการเรียนของนักเรียนในรายวิชา/ภาคเรียนเดียวกัน', getDuplicateMatches(
    data.grades,
    (grade) => `${grade.studentId}|${grade.courseId}|${grade.academicYear}|${grade.semester}`,
    (grade) => {
      const student = studentById.get(grade.studentId);
      const course = courseById.get(grade.courseId);
      return `${student ? `${student.firstNameTh} ${student.lastNameTh}` : grade.studentId} · ${course?.code || grade.courseId} · ${grade.academicYear}/${grade.semester}`;
    },
    (grade) => `ผลการเรียน ${grade.letterGrade} · ${grade.totalScore} คะแนน`
  ));
  addCheck('billing', 'เลขที่ใบแจ้งหนี้', getDuplicateMatches(
    data.invoices,
    (invoice) => invoice.invoiceNumber,
    (invoice) => invoice.invoiceNumber,
    (invoice) => `${studentById.get(invoice.studentId)?.firstNameTh || invoice.studentId} · ${invoice.academicYear}/${invoice.semester} · ${invoice.totalAmount} บาท`
  ));
  addCheck('billing', 'ใบแจ้งหนี้นักเรียน/รายการ/ภาคเรียนเดียวกัน', getDuplicateMatches(
    data.invoices,
    (invoice) => `${invoice.studentId}|${invoice.semester}|${(invoice.items[0]?.title || '').trim()}`,
    (invoice) => `${studentById.get(invoice.studentId)?.firstNameTh || invoice.studentId} · ${invoice.items[0]?.title || 'ไม่ระบุรายการ'} · ${invoice.semester}`,
    (invoice) => `${invoice.invoiceNumber} · ${invoice.totalAmount} บาท · ${invoice.academicYear}`
  ));
  addCheck('timetable', 'ห้องเรียนเดียวกันในวัน/คาบเดียวกัน', getDuplicateMatches(
    data.timetableSlots,
    (slot) => `${slot.classRoom}|${slot.dayOfWeek}|${slot.periodNumber}`,
    (slot) => `${slot.classRoom} · ${dayLabels[slot.dayOfWeek] || slot.dayOfWeek} · คาบ ${slot.periodNumber}`,
    (slot) => `${slot.courseCode} ${slot.courseTitleTh} · ${slot.teacherName} · ${slot.room || 'ไม่ระบุห้องสถานที่'}`
  ));
  addCheck('attendance', 'บันทึกเช็คชื่อรายวันซ้ำ', getDuplicateMatches(
    data.attendance || [],
    (attendance) => `${attendance.studentId}|${attendance.date}|${attendance.recordType || 'check_in'}`,
    (attendance) => `${studentById.get(attendance.studentId)?.firstNameTh || attendance.studentId} · ${attendance.date} · ${checkTypeLabel(attendance.recordType)}`,
    (attendance) => `${{ present: 'มาเรียน', late: 'มาสาย', absent: 'ขาดเรียน', sick: 'ลาป่วย', leave: 'ลา' }[attendance.status]} · ${attendance.time}`
  ));
  addCheck('attendance', 'บันทึกเช็คชื่อรายคาบซ้ำ', getDuplicateMatches(
    data.periodAttendance || [],
    (attendance) => `${attendance.studentId}|${attendance.courseId}|${attendance.date}|${attendance.periodNumber}|${attendance.recordType || 'check_in'}`,
    (attendance) => `${studentById.get(attendance.studentId)?.firstNameTh || attendance.studentId} · ${attendance.courseCode} · ${attendance.date} · คาบ ${attendance.periodNumber} · ${checkTypeLabel(attendance.recordType)}`,
    (attendance) => `${{ present: 'มาเรียน', late: 'มาสาย', absent: 'ขาดเรียน', excused: 'ได้รับยกเว้น' }[attendance.status]} · ${attendance.verifiedByTeacherName}`
  ));
  addCheck('announcements', 'หัวข้อประกาศและกลุ่มเป้าหมายซ้ำ', getDuplicateMatches(
    data.announcements || [],
    (announcement) => `${announcement.title.trim()}|${announcement.targetAudience}`,
    (announcement) => `${announcement.title} · ${announcement.targetAudience}`,
    (announcement) => `${announcement.publishedAt} · ${announcement.author}`
  ));
  addCheck('behavior_sdq', 'บันทึกพฤติกรรมนักเรียน/วัน/หัวข้อซ้ำ', getDuplicateMatches(
    data.behaviorRecords || [],
    (record) => `${record.studentId}|${record.date}|${record.type}|${record.category.trim()}`,
    (record) => `${record.studentName} · ${record.date} · ${record.category}`,
    (record) => `${record.type === 'merit' ? 'ความดี' : 'ความผิด'} · ${record.points} คะแนน · ${record.recordedBy}`
  ));
  addCheck('behavior_sdq', 'ผลประเมิน SDQ ซ้ำในภาคเรียนเดียวกัน', getDuplicateMatches(
    data.sdqAssessments || [],
    (assessment) => `${assessment.studentId}|${assessment.academicYear}|${assessment.semester}`,
    (assessment) => `${assessment.studentName} · ${assessment.academicYear}/${assessment.semester}`,
    (assessment) => `ผู้ประเมิน ${assessment.assessorName} · ${assessment.date}`
  ));
  addCheck('infirmary', 'บันทึกห้องพยาบาลซ้ำ', getDuplicateMatches(
    data.infirmaryVisits || [],
    (visit) => `${visit.studentId}|${visit.visitDate}|${visit.visitTime}|${visit.symptoms.trim()}`,
    (visit) => `${visit.studentName} · ${visit.visitDate} ${visit.visitTime} · ${visit.symptoms}`,
    (visit) => `${visit.category} · ${visit.recordedByNurse}`
  ));
  addCheck('homework', 'รายการส่งการบ้านซ้ำ', getDuplicateMatches(
    data.homeworkSubmissions || [],
    (submission) => `${submission.studentId}|${submission.assignmentId}|${submission.courseCode}`,
    (submission) => `${submission.studentName} · ${submission.assignmentTitle} · ${submission.courseCode}`,
    (submission) => `${submission.status} · ${submission.submittedAt || 'ยังไม่ระบุวันส่ง'}`
  ));
  addCheck('attendance', 'คำขอลาซ้ำในช่วงวันเดียวกัน', getDuplicateMatches(
    data.leaveRequests || [],
    (request) => `${request.userId}|${request.startDate}|${request.endDate}|${request.leaveType}`,
    (request) => `${request.userName} · ${request.startDate}–${request.endDate} · ${{ sick: 'ลาป่วย', personal: 'ลากิจ', official: 'ไปราชการ', vacation: 'ลาพักร้อน' }[request.leaveType]}`,
    (request) => `${request.userRole === 'teacher' ? 'ครู' : 'นักเรียน'} · ${{ pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' }[request.status]}`
  ));

  return [...reports.values()];
}

export function getDuplicateIdReports(data: Record<string, Array<{ id: string }>>): DuplicateRecordReport[] {
  const labels: Record<string, { label: string; target: DuplicateRecordTarget }> = {
    students: { label: 'ระเบียนนักเรียน', target: 'students' },
    teachers: { label: 'ระเบียนบุคลากร', target: 'teachers' },
    courses: { label: 'ระเบียนรายวิชา', target: 'courses' },
    grades: { label: 'ระเบียนผลการเรียน', target: 'gradebook' },
    attendance: { label: 'ระเบียนเวลาเรียน', target: 'attendance' },
    invoices: { label: 'ระเบียนใบแจ้งหนี้', target: 'billing' },
    announcements: { label: 'ระเบียนประกาศ', target: 'announcements' },
    lessons: { label: 'ระเบียนบทเรียน', target: 'dashboard' },
    assignments: { label: 'ระเบียนงานที่มอบหมาย', target: 'dashboard' },
    questions: { label: 'ระเบียนข้อสอบ', target: 'central_exam_hub' },
    periodAttendance: { label: 'ระเบียนเช็คชื่อรายคาบ', target: 'attendance' },
    portfolioItems: { label: 'ระเบียนแฟ้มสะสมผลงาน', target: 'portfolio' },
    timetableSlots: { label: 'ระเบียนตารางสอน', target: 'timetable' },
    behaviorRecords: { label: 'ระเบียนพฤติกรรม', target: 'behavior_sdq' },
    sdqAssessments: { label: 'ระเบียนประเมิน SDQ', target: 'behavior_sdq' },
    infirmaryVisits: { label: 'ระเบียนห้องพยาบาล', target: 'infirmary' },
    homeworkSubmissions: { label: 'ระเบียนการส่งการบ้าน', target: 'homework' },
  };
  const reports = new Map<DuplicateRecordTarget, DuplicateRecordReport>();
  Object.entries(data).forEach(([collection, records]) => {
    const collectionLabel = labels[collection] || { label: collection, target: 'students' as const };
    const groups = getDuplicateMatches(
      records,
      (record) => record.id,
      (record) => record.id,
      (record) => `ID ${record.id}`
    );
    if (groups.length === 0) return;
    const destination = DUPLICATE_REPORT_DESTINATIONS[collectionLabel.target];
    const report = reports.get(collectionLabel.target) || {
      target: collectionLabel.target,
      ...(collectionLabel.target === 'dashboard' ? { programMode: 'lms_classroom' as const } : {}),
      module: destination.module,
      guidance: destination.guidance,
      checks: [],
    };
    report.checks.push({ label: `${collectionLabel.label} (ID ซ้ำ)`, groups });
    reports.set(collectionLabel.target, report);
  });
  return [...reports.values()];
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
  candidate: Pick<TimetableSlot, 'academicYear' | 'semester' | 'classRoom' | 'dayOfWeek' | 'periodNumber' | 'teacherName' | 'room'>,
  existing: TimetableSlot[],
  excludeId?: string
): string[] {
  const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const pool = existing.filter((slot) => (
    slot.id !== excludeId &&
    (!candidate.academicYear || !slot.academicYear || slot.academicYear === candidate.academicYear) &&
    (!candidate.semester || !slot.semester || slot.semester === candidate.semester)
  ));
  const reasons: string[] = [];
  if (
    pool.some(
      (s) =>
        normalize(s.classRoom) === normalize(candidate.classRoom) &&
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
        normalize(s.teacherName) === normalize(candidate.teacherName) &&
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
        normalize(s.room) === normalize(candidate.room) &&
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
