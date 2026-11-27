import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSlotStudents } from './timetableAttendanceStatus';
import { slotMatchesLoggedInTeacher } from './courseTeacherFilter';
import type { AuthUser, Course, Student, TimetableSlot } from '../types';

const makeStudent = (overrides: Partial<Student> & { id: string }): Student => ({
  schoolId: 'sch-1',
  studentIdNumber: overrides.id,
  firstNameEn: overrides.id,
  lastNameEn: 'Student',
  firstNameTh: overrides.id,
  lastNameTh: 'นักเรียน',
  gender: 'other',
  dateOfBirth: '2014-01-01',
  gradeLevel: 'ประถมศึกษาปีที่ 1 (P.1)',
  room: '1',
  status: 'active',
  avatarUrl: '',
  gpa: 3.5,
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  guardianEmail: '',
  enrolledDate: '2026-05-01',
  ...overrides,
});

const makeSlot = (overrides: Partial<TimetableSlot> = {}): TimetableSlot => ({
  id: 'slot-1',
  schoolId: 'sch-1',
  academicYear: '2569',
  semester: '1',
  dayOfWeek: 'thu',
  periodNumber: 2,
  startTime: '09:20',
  endTime: '10:10',
  courseCode: 'TH101',
  courseTitleTh: 'ภาษาไทย',
  courseTitleEn: 'Thai',
  teacherName: 'ครูสมศรี ใจดี',
  room: 'ห้อง 101',
  classRoom: 'ป.1/1',
  colorTag: 'sky',
  ...overrides,
});

test('resolveSlotStudents matches Thai gradeLevel + room variants from timetable classRoom', () => {
  const students = [
    makeStudent({ id: 's-p1-1', gradeLevel: 'ประถมศึกษาปีที่ 1 (P.1)', room: '1' }),
    makeStudent({ id: 's-p1-2', gradeLevel: 'ประถมศึกษาปีที่ 1 (P.1)', room: '2' }),
    makeStudent({ id: 's-m4-401', gradeLevel: 'มัธยมศึกษาปีที่ 4 (M.4)', room: 'ห้อง 401 (วิทย์-คณิต)' }),
  ];

  const courses: Course[] = [
    {
      id: 'crs-th',
      schoolId: 'sch-1',
      code: 'TH101',
      titleEn: 'Thai',
      titleTh: 'ภาษาไทย',
      category: 'core',
      credits: 1,
      teacherName: 'ครูสมศรี ใจดี',
      teacherEmail: 'somsri@school.ac.th',
      department: 'ภาษาไทย',
      room: 'ห้องคอมพิวเตอร์',
      academicYear: '2569',
      semester: '1',
      schedule: '',
      description: '',
      enrolledStudentIds: [],
    },
  ];

  const p1Roster = resolveSlotStudents(makeSlot({ classRoom: 'ป.1/1', courseId: 'crs-th' }), courses, students);
  assert.deepEqual(
    p1Roster.map((s) => s.id),
    ['s-p1-1']
  );

  const m4Roster = resolveSlotStudents(
    makeSlot({ classRoom: 'ม.4/401', courseCode: 'SC401', courseId: undefined }),
    courses,
    students
  );
  assert.deepEqual(
    m4Roster.map((s) => s.id),
    ['s-m4-401']
  );
});

test('resolveSlotStudents falls back to school students when slot room has no direct homeroom match', () => {
  const students = [
    makeStudent({ id: 's1', schoolId: 'sch-1', room: '1' }),
    makeStudent({ id: 's2', schoolId: 'sch-2', room: '1' }),
  ];

  const fallbackRoster = resolveSlotStudents(
    makeSlot({ classRoom: 'ห้องกิจกรรมรวม', room: 'หอประชุม' }),
    [],
    students
  );
  assert.deepEqual(
    fallbackRoster.map((s) => s.id),
    ['s1']
  );
});

test('slotMatchesLoggedInTeacher includes timetable slot even when Teacher profile is not linked yet', () => {
  const user: AuthUser = {
    id: 'usr-t1',
    schoolId: 'sch-1',
    fullNameTh: 'ครูสมศรี ใจดี',
    fullNameEn: 'Somsri Jaidee',
    email: 'user-login@school.ac.th',
    role: 'teacher',
    avatarUrl: '',
  };

  assert.equal(
    slotMatchesLoggedInTeacher(
      makeSlot({ teacherName: 'สมศรี ใจดี' }),
      user,
      undefined,
      []
    ),
    true
  );
});
