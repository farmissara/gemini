import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPeriodAttendanceForCourses,
  getCourseRosterStudentIds,
  getTeacherHomeroomStudents,
} from './attendanceScope';
import type { AuthUser, Course, PeriodAttendanceRecord, Student, Teacher } from '../types';

const makeStudent = (id: string, room: string, gradeLevel = 'มัธยมศึกษาปีที่ 4 (M.4)'): Student => ({
  id,
  schoolId: 'school-1',
  studentIdNumber: id,
  firstNameEn: id,
  lastNameEn: 'Student',
  firstNameTh: id,
  lastNameTh: 'นักเรียน',
  gender: 'other',
  dateOfBirth: '2010-01-01',
  gradeLevel,
  room,
  status: 'active',
  avatarUrl: '',
  gpa: 3,
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  guardianEmail: '',
  lineLinked: false,
  lineNotifyEnabled: false,
  enrolledDate: '2026-01-01',
});

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1',
  schoolId: 'school-1',
  code: 'SCI-1',
  titleEn: 'Science',
  titleTh: 'วิทยาศาสตร์',
  category: 'core',
  credits: 1,
  teacherName: 'ครูสมหญิง',
  teacherEmail: 'teacher@school.test',
  department: 'วิทยาศาสตร์',
  schedule: '',
  room: '401',
  academicYear: '2569',
  semester: '1',
  enrolledStudentIds: [],
  description: '',
  ...overrides,
});

const makePeriodRecord = (courseId: string, studentId: string): PeriodAttendanceRecord => ({
  id: `${courseId}-${studentId}`,
  schoolId: 'school-1',
  courseId,
  courseCode: 'SCI-1',
  periodNumber: 1,
  timeSlot: '08:30 - 09:20',
  date: '2026-11-26',
  studentId,
  status: 'present',
  verifiedByTeacherId: 'teacher-1',
  verifiedByTeacherName: 'ครูสมหญิง',
  checkMethod: 'teacher_proxy',
});

test('getTeacherHomeroomStudents restricts teachers to their assigned rooms and fails closed without a linked profile', () => {
  const teacherUser: AuthUser = {
    id: 'user-1',
    schoolId: 'school-1',
    role: 'teacher',
    fullNameTh: 'ครูสมหญิง',
    fullNameEn: 'Somying',
    email: 'teacher@school.test',
    avatarUrl: '',
    lineConnected: false,
    teacherRecordId: 'teacher-1',
  };
  const teacher = {
    id: 'teacher-1',
    schoolId: 'school-1',
    email: 'teacher@school.test',
    teacherIdNumber: 'T-1',
    fullNameTh: 'ครูสมหญิง',
    fullNameEn: 'Somying',
    gender: 'other',
    phone: '',
    avatarUrl: '',
    academicDegree: '',
    major: '',
    academicStanding: '',
    department: '',
    teacherLicenseNo: '',
    teachingSubjects: [],
    homeroomClasses: ['ห้อง 401 (วิทย์-คณิต)', 'ม.4/2'],
    teachingGrades: [],
  } satisfies Teacher;
  const students = [makeStudent('s401', '401'), makeStudent('s402', '402'), makeStudent('s42', '2')];

  assert.deepEqual(
    getTeacherHomeroomStudents(teacherUser, [teacher], students).map((student) => student.id),
    ['s401', 's42']
  );
  assert.deepEqual(getTeacherHomeroomStudents(teacherUser, [], students), []);
});

test('period attendance records are filtered to course students', () => {
  const students = [makeStudent('s401', '401'), makeStudent('s402', '402')];
  const course = makeCourse({ enrolledStudentIds: ['s401'] });
  const roomCourse = makeCourse({ id: 'course-room', enrolledStudentIds: [], room: '402' });

  assert.deepEqual(getCourseRosterStudentIds(course, students), ['s401']);
  assert.deepEqual(getCourseRosterStudentIds(roomCourse, students), ['s402']);
  assert.deepEqual(
    filterPeriodAttendanceForCourses(
      [
        makePeriodRecord('course-1', 's401'),
        makePeriodRecord('course-1', 's402'),
        makePeriodRecord('unowned-course', 's401'),
      ],
      [course],
      students
    ).map((record) => record.id),
    ['course-1-s401']
  );
});
