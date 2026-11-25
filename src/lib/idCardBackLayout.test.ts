import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, SchoolPeriodTime, Student, Teacher, TimetableSlot } from '../types';
import {
  buildCompactCardTimetableMatrix,
  buildMirroredDuplexBackSlots,
  chunkPrintItems,
  formatMaskedNationalId,
  getSavedIdCardBackMode,
  getStudentTimetableSlots,
  getTeacherTimetableSlots,
  normalizeIdCardBackMode,
} from './idCardBackLayout';

const makeStudent = (overrides: Partial<Student> = {}): Student => ({
  id: 'stu-1',
  schoolId: 'school-1',
  studentIdNumber: '1001',
  firstNameTh: 'เด็กหญิงมานี',
  lastNameTh: 'ใจดี',
  firstNameEn: 'Manee',
  lastNameEn: 'Jaidee',
  dateOfBirth: '2019-05-10',
  gradeLevel: 'ประถมศึกษาปีที่ 1',
  room: 'ป.1/1',
  status: 'active',
  gender: 'female',
  avatarUrl: '',
  gpa: 3.85,
  guardianName: 'นางสุดา ใจดี',
  guardianRelation: 'มารดา',
  guardianPhone: '0811112222',
  guardianEmail: 'suda@example.com',
  lineLinked: false,
  lineNotifyEnabled: false,
  enrolledDate: '2026-05-01',
  ...overrides,
});

const makeTeacher = (overrides: Partial<Teacher> = {}): Teacher => ({
  id: 'tch-1',
  schoolId: 'school-1',
  teacherIdNumber: 'T001',
  fullNameTh: 'ครูสมชาย ใจดี',
  fullNameEn: 'Somchai Jaidee',
  positionTitle: 'ครูชำนาญการ',
  gender: 'male',
  email: 'somchai@school.ac.th',
  phone: '0890001111',
  avatarUrl: '',
  academicDegree: 'ค.บ.',
  major: 'คณิตศาสตร์',
  academicStanding: 'ครูชำนาญการ',
  department: 'คณิตศาสตร์',
  teacherLicenseNo: 'TL-001',
  teachingSubjects: ['คณิตศาสตร์ ป.1'],
  homeroomClasses: ['ป.1/1'],
  teachingGrades: ['ป.1'],
  ...overrides,
});

const makeSlot = (overrides: Partial<TimetableSlot> = {}): TimetableSlot => ({
  id: 'slot-1',
  dayOfWeek: 'mon',
  periodNumber: 1,
  startTime: '08:30',
  endTime: '09:20',
  courseCode: 'ค11101',
  courseTitleTh: 'คณิตศาสตร์ 1',
  courseTitleEn: 'Mathematics 1',
  teacherName: 'ครูสมชาย ใจดี',
  room: 'อาคาร 1 ห้อง 101',
  classRoom: 'ป.1/1',
  colorTag: 'blue',
  ...overrides,
});

test('normalizeIdCardBackMode validates allowed modes and safely falls back', () => {
  assert.equal(normalizeIdCardBackMode('timetable'), 'timetable');
  assert.equal(normalizeIdCardBackMode('medical_emergency'), 'medical_emergency');
  assert.equal(normalizeIdCardBackMode('qr_gate_pass'), 'qr_gate_pass');
  assert.equal(normalizeIdCardBackMode('unknown_mode'), 'rules_contact');
  assert.equal(normalizeIdCardBackMode(null), 'rules_contact');
  assert.equal(getSavedIdCardBackMode('school-1', 'student'), 'rules_contact');
});

test('getStudentTimetableSlots matches normalized room names without leaking ป.1/10', () => {
  const student = makeStudent({ room: 'ป.1/1', gradeLevel: 'ป.1' });
  const slots: TimetableSlot[] = [
    makeSlot({ id: 's1', classRoom: 'ป1/1', courseCode: 'ท11101' }),
    makeSlot({ id: 's2', classRoom: 'ป.1/10', courseCode: 'ท11102' }),
    makeSlot({ id: 's3', classRoom: 'ป.2/1', courseCode: 'ท12101' }),
  ];

  const matched = getStudentTimetableSlots(student, slots, []);
  assert.deepEqual(
    matched.map((s) => s.id),
    ['s1'],
  );
});

test('getTeacherTimetableSlots matches primary teacher, honorific differences, co-teacher, and linked course', () => {
  const teacher = makeTeacher({
    fullNameTh: 'นายสมชาย ใจดี',
    email: 'somchai@school.ac.th',
  });
  const courses: Course[] = [
    {
      id: 'c-1',
      code: 'ว11101',
      titleTh: 'วิทยาศาสตร์',
      titleEn: 'Science',
      category: 'core',
      credits: 1,
      teacherName: 'ครูสมชาย ใจดี',
      teacherEmail: 'somchai@school.ac.th',
      department: 'วิทยาศาสตร์',
      schedule: 'mon 08:30-09:20',
      room: 'ป.1/1',
      academicYear: '2569',
      semester: '1',
      enrolledStudentIds: [],
      description: '',
    },
  ];
  const slots: TimetableSlot[] = [
    makeSlot({ id: 't1', teacherName: 'ครูสมชาย ใจดี', classRoom: 'ป.1/1' }),
    makeSlot({ id: 't2', teacherName: 'ครูวิไล', coTeacherName: 'สมชาย ใจดี', classRoom: 'ป.1/2' }),
    makeSlot({ id: 't3', teacherName: '', courseId: 'c-1', courseCode: 'ว11101', classRoom: 'ป.1/3' }),
    makeSlot({ id: 't4', teacherName: 'ครูท่านอื่น', courseCode: 'อ11101', classRoom: 'ป.2/1' }),
  ];

  const matched = getTeacherTimetableSlots(teacher, slots, courses);
  assert.deepEqual(
    matched.map((s) => s.id),
    ['t1', 't2', 't3'],
  );
});

test('buildCompactCardTimetableMatrix skips breaks, keeps weekdays, and maps cells accurately', () => {
  const periods: SchoolPeriodTime[] = [
    { periodNumber: 1, startTime: '08:30', endTime: '09:20' },
    { periodNumber: 2, startTime: '09:20', endTime: '10:10' },
    { periodNumber: 0, startTime: '12:00', endTime: '13:00', isBreak: true },
    { periodNumber: 3, startTime: '13:00', endTime: '13:50' },
  ];
  const slots: TimetableSlot[] = [
    makeSlot({ id: 'm1', dayOfWeek: 'mon', periodNumber: 1, courseCode: 'ท11101' }),
    makeSlot({ id: 'f3', dayOfWeek: 'fri', periodNumber: 3, courseCode: 'ค11101' }),
  ];

  const matrix = buildCompactCardTimetableMatrix(slots, periods);
  assert.deepEqual(
    matrix.days.map((d) => d.key),
    ['mon', 'tue', 'wed', 'thu', 'fri'],
  );
  assert.deepEqual(matrix.periods, [1, 2, 3]);
  assert.equal(matrix.totalWeeklyPeriods, 2);
  assert.equal(matrix.cellMap.get('mon::1')?.[0]?.courseCode, 'ท11101');
  assert.equal(matrix.cellMap.get('fri::3')?.[0]?.courseCode, 'ค11101');
  assert.equal(matrix.cellMap.get('tue::1'), undefined);
});

test('formatMaskedNationalId masks 13-digit Thai national IDs and handles empty values', () => {
  assert.equal(formatMaskedNationalId('1100200300405'), '1-1002-XXXXX-40-5');
  assert.equal(formatMaskedNationalId(''), '-');
});

test('chunkPrintItems and buildMirroredDuplexBackSlots paginate and mirror rows for duplex printing', () => {
  assert.deepEqual(chunkPrintItems(['A', 'B', 'C', 'D', 'E'], 2), [['A', 'B'], ['C', 'D'], ['E']]);
  assert.deepEqual(buildMirroredDuplexBackSlots(['A', 'B', 'C'], 2), ['B', 'A', null, 'C']);
});
