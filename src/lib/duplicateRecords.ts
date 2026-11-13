import { Course, GradeRecord, Student, Teacher, TimetableSlot, TuitionInvoice } from '../types';

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
}): string[] {
  const warnings: string[] = [];
  const addWarning = (label: string, count: number) => {
    if (count > 0) warnings.push(`${label} ซ้ำ ${count} กลุ่ม`);
  };

  addWarning('รหัสนักเรียน', duplicateGroupCount(data.students, (student) => student.studentIdNumber));
  addWarning('เลขประจำตัวประชาชนนักเรียน', duplicateGroupCount(
    data.students.filter((student) => student.nationalId),
    (student) => student.nationalId || ''
  ));
  addWarning('รหัสบุคลากร', duplicateGroupCount(data.teachers, (teacher) => teacher.teacherIdNumber));
  addWarning('อีเมลบุคลากร', duplicateGroupCount(
    data.teachers.filter((teacher) => teacher.email),
    (teacher) => teacher.email
  ));
  addWarning('รหัสวิชาในปี/ภาคเรียนเดียวกัน', duplicateGroupCount(
    data.courses,
    (course) => course.code.trim()
      ? `${course.code.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
      : ''
  ));
  addWarning('ผลการเรียนของนักเรียนในรายวิชา/ภาคเรียนเดียวกัน', duplicateGroupCount(
    data.grades,
    (grade) => `${grade.studentId}|${grade.courseId}|${grade.academicYear}|${grade.semester}`
  ));
  addWarning('เลขที่ใบแจ้งหนี้', duplicateGroupCount(data.invoices, (invoice) => invoice.invoiceNumber));
  addWarning('รายการตารางสอนห้องเดียวกันในวัน/คาบเดียวกัน', duplicateGroupCount(
    data.timetableSlots,
    (slot) => `${slot.classRoom}|${slot.dayOfWeek}|${slot.periodNumber}|${slot.courseId || slot.courseCode}`
  ));

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
    periodAttendance: 'ระเบียนเช็กชื่อรายคาบ',
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
  if (hasDuplicateCandidate(candidates, existingRecords, (student) => student.nationalId || '')) {
    warnings.push('เลขประจำตัวประชาชนซ้ำ');
  }
  return warnings;
}

export function getTeacherDuplicateReasons(candidates: Teacher[], existing: Teacher[]): string[] {
  const warnings: string[] = [];
  if (hasDuplicateCandidate(candidates, existing, (teacher) => teacher.teacherIdNumber)) {
    warnings.push('รหัสบุคลากรซ้ำ');
  }
  if (hasDuplicateCandidate(
    candidates.filter((teacher) => teacher.email),
    existing.filter((teacher) => teacher.email),
    (teacher) => teacher.email
  )) {
    warnings.push('อีเมลบุคลากรซ้ำ');
  }
  return warnings;
}

export function getCourseDuplicateReasons(candidates: Course[], existing: Course[]): string[] {
  const keyFor = (course: Course) => course.code.trim()
    ? `${course.code.trim()}|${course.academicYear.trim()}|${course.semester.trim()}`
    : '';
  return hasDuplicateCandidate(candidates, existing, keyFor)
    ? ['รหัสวิชาซ้ำในปี/ภาคเรียนเดียวกัน']
    : [];
}

export function getGradeDuplicateReasons(candidates: GradeRecord[], existing: GradeRecord[]): string[] {
  const keyFor = (grade: GradeRecord) =>
    `${grade.studentId}|${grade.courseId}|${grade.academicYear}|${grade.semester}`;
  return hasDuplicateCandidate(candidates, existing, keyFor)
    ? ['ผลการเรียนซ้ำสำหรับนักเรียน/รายวิชา/ภาคเรียนเดียวกัน']
    : [];
}
