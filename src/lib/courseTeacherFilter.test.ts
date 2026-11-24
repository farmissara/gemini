import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCourseTeacherOptions,
  courseMatchesTeacherFilter,
  isSchoolWideTimetableActivity,
  resolveMatchedTeacherForUser,
  slotMatchesLoggedInTeacher,
  teacherMatchesCourse,
  userMatchesCourse,
} from './courseTeacherFilter';
import type { AuthUser, Course, Teacher, TimetableSlot } from '../types';

const makeTeacher = (overrides: Partial<Teacher> = {}): Teacher => ({
  id: 'tch-1',
  schoolId: 'sch-1',
  teacherIdNumber: 'T001',
  fullNameTh: 'สมหญิง รักเรียน',
  fullNameEn: 'Somying Rakrian',
  positionTitle: 'ครู',
  gender: 'female',
  email: 'somying@school.ac.th',
  phone: '0810000001',
  avatarUrl: '',
  academicDegree: '',
  major: '',
  academicStanding: '',
  department: 'วิทยาศาสตร์',
  teacherLicenseNo: '',
  teachingSubjects: [],
  homeroomClasses: [],
  teachingGrades: [],
  ...overrides,
});

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'usr-1',
  schoolId: 'sch-1',
  role: 'teacher',
  fullNameTh: 'สมหญิง รักเรียน',
  fullNameEn: 'Somying Rakrian',
  email: 'somying@school.ac.th',
  avatarUrl: '',
  lineConnected: false,
  ...overrides,
});

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'crs-1',
  schoolId: 'sch-1',
  code: 'ว21101',
  titleEn: 'Science 1',
  titleTh: 'วิทยาศาสตร์ 1',
  category: 'core',
  credits: 1.5,
  teacherName: 'สมหญิง รักเรียน',
  teacherEmail: 'somying@school.ac.th',
  department: 'วิทยาศาสตร์',
  schedule: '',
  room: '301',
  academicYear: '2569',
  semester: '1',
  enrolledStudentIds: [],
  description: '',
  ...overrides,
});

const makeSlot = (overrides: Partial<TimetableSlot> = {}): TimetableSlot => ({
  id: 'slot-1',
  schoolId: 'sch-1',
  academicYear: '2569',
  semester: '1',
  dayOfWeek: 'mon',
  periodNumber: 1,
  startTime: '08:30',
  endTime: '09:20',
  courseId: 'crs-1',
  courseCode: 'ว21101',
  courseTitleTh: 'วิทยาศาสตร์ 1',
  courseTitleEn: 'Science 1',
  teacherName: 'สมชาย ใจดี',
  room: '301',
  classRoom: 'ม.1/1',
  colorTag: 'sky',
  ...overrides,
});

test('resolveMatchedTeacherForUser prefers the linked teacher record', () => {
  const linkedTeacher = makeTeacher({ id: 'linked-teacher', email: 'linked@school.ac.th' });
  const unrelatedTeacher = makeTeacher({ id: 'usr-1', email: 'other@school.ac.th' });
  const user = makeUser({ teacherRecordId: linkedTeacher.id });

  assert.equal(resolveMatchedTeacherForUser(user, [unrelatedTeacher, linkedTeacher]), linkedTeacher);
});

test('teacherMatchesCourse and userMatchesCourse match co-taught courses with honorific differences', () => {
  const coTeacher = makeTeacher({
    id: 'tch-2',
    fullNameTh: 'สมหญิง รักเรียน',
    email: 'somying@school.ac.th',
  });
  const coTeacherUser = makeUser({
    id: 'usr-2',
    fullNameTh: 'สมหญิง รักเรียน',
    email: 'somying@school.ac.th',
  });
  const coTaughtCourse = makeCourse({
    id: 'crs-co',
    teacherName: 'อ.สมชาย ใจดี + ครูสมหญิง รักเรียน',
    teacherEmail: 'somchai@school.ac.th',
  });

  assert.equal(teacherMatchesCourse(coTeacher, coTaughtCourse), true);
  assert.equal(userMatchesCourse(coTeacherUser, coTeacher, coTaughtCourse), true);
  assert.equal(
    userMatchesCourse(makeUser({ fullNameTh: 'สมหญิง รักเรียน', email: 'unlinked@school.ac.th' }), undefined, coTaughtCourse),
    false
  );
});

test('slotMatchesLoggedInTeacher includes direct coTeacherName, honorific prefixes, and course-level co-teaching fallback', () => {
  const coTeacher = makeTeacher({
    id: 'tch-2',
    fullNameTh: 'สมหญิง รักเรียน',
    email: 'somying@school.ac.th',
  });
  const coTeacherUser = makeUser({
    id: 'usr-2',
    fullNameTh: 'สมหญิง รักเรียน',
    email: 'somying@school.ac.th',
  });

  const coTaughtCourse = makeCourse({
    id: 'crs-co',
    code: 'ว21102',
    teacherName: 'อ.สมชาย ใจดี + อ.สมหญิง รักเรียน',
    teacherEmail: 'somchai@school.ac.th',
  });

  const directCoSlot = makeSlot({
    id: 'slot-co-direct',
    courseId: 'crs-other',
    courseCode: 'ท21101',
    teacherName: 'อ.สมชาย ใจดี',
    coTeacherName: 'อ.สมหญิง รักเรียน',
  });

  const courseFallbackSlot = makeSlot({
    id: 'slot-co-course',
    courseId: 'crs-co',
    courseCode: 'ว21102',
    teacherName: 'อ.สมชาย ใจดี',
    coTeacherName: undefined,
  });

  const unrelatedSlot = makeSlot({
    id: 'slot-unrelated',
    courseId: 'crs-unrelated',
    courseCode: 'ค21101',
    teacherName: 'อ.สมชาย ใจดี',
    coTeacherName: undefined,
  });

  assert.equal(slotMatchesLoggedInTeacher(directCoSlot, coTeacherUser, coTeacher, [coTaughtCourse]), true);
  assert.equal(slotMatchesLoggedInTeacher(directCoSlot, coTeacherUser, undefined, []), false);
  assert.equal(slotMatchesLoggedInTeacher(courseFallbackSlot, coTeacherUser, coTeacher, [coTaughtCourse]), true);
  assert.equal(slotMatchesLoggedInTeacher(courseFallbackSlot, coTeacherUser, undefined, [coTaughtCourse]), false);
  assert.equal(slotMatchesLoggedInTeacher(unrelatedSlot, coTeacherUser, coTeacher, [coTaughtCourse]), false);
});

test('school-wide timetable activities still require an explicit teacher assignment', () => {
  const teacherUser = makeUser({
    id: 'usr-scout',
    fullNameTh: 'ครูผู้ช่วย โรงเรียน',
  });

  const scoutSlot = makeSlot({
    id: 'slot-scout',
    courseCode: 'SCOUT101',
    courseTitleTh: 'กิจกรรมลูกเสือ-เนตรนารี',
    teacherName: 'ครูประจำกิจกรรม',
  });
  const assignedScoutSlot = makeSlot({
    id: 'slot-scout-assigned',
    courseCode: 'SCOUT101',
    courseTitleTh: 'กิจกรรมลูกเสือ-เนตรนารี',
    teacherName: teacherUser.fullNameTh,
  });
  const allTeacherSlot = makeSlot({
    id: 'slot-all-teachers',
    courseCode: 'ACT101',
    teacherName: 'ครูทุกคน',
  });

  assert.equal(slotMatchesLoggedInTeacher(scoutSlot, teacherUser, undefined, []), false);
  assert.equal(slotMatchesLoggedInTeacher(assignedScoutSlot, teacherUser, makeTeacher({
    fullNameTh: teacherUser.fullNameTh,
    email: teacherUser.email,
  }), []), true);
  assert.equal(slotMatchesLoggedInTeacher(allTeacherSlot, teacherUser, undefined, []), false);
  assert.equal(isSchoolWideTimetableActivity(scoutSlot), true);
  assert.equal(isSchoolWideTimetableActivity(allTeacherSlot), true);
  assert.equal(isSchoolWideTimetableActivity(makeSlot({ teacherName: 'ครูสมชาย ใจดี' })), false);
});

test('buildCourseTeacherOptions keeps co-teachers isolated so filtering by co-teacher does not include primary teacher solo courses', () => {
  const teacherA = makeTeacher({
    id: 'tch-a',
    fullNameTh: 'สมชาย ใจดี',
    email: 'somchai@school.ac.th',
  });
  const teacherB = makeTeacher({
    id: 'tch-b',
    fullNameTh: 'สมหญิง รักเรียน',
    email: 'somying@school.ac.th',
  });

  const soloCourseA = makeCourse({
    id: 'crs-a',
    code: 'ว101',
    teacherName: 'อ.สมชาย ใจดี',
    teacherEmail: 'somchai@school.ac.th',
  });
  const coCourseAB = makeCourse({
    id: 'crs-ab',
    code: 'ว102',
    teacherName: 'อ.สมชาย ใจดี + ครูสมหญิง รักเรียน',
    teacherEmail: 'somchai@school.ac.th',
  });
  const soloCourseB = makeCourse({
    id: 'crs-b',
    code: 'ว103',
    teacherName: 'สมหญิง รักเรียน',
    teacherEmail: 'somying@school.ac.th',
  });

  const options = buildCourseTeacherOptions([soloCourseA, coCourseAB, soloCourseB], [teacherA, teacherB]);
  const optionB = options.find((opt) => opt.emails.includes('somying@school.ac.th'));
  assert.ok(optionB);

  assert.equal(courseMatchesTeacherFilter(soloCourseA, optionB.key, options), false);
  assert.equal(courseMatchesTeacherFilter(coCourseAB, optionB.key, options), true);
  assert.equal(courseMatchesTeacherFilter(soloCourseB, optionB.key, options), true);
});
