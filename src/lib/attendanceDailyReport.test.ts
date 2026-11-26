import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyPeriodReportSessions,
  buildGateAttendanceReportRows,
  getTimetableDayForDate,
} from './attendanceDailyReport';
import type {
  AttendanceRecord,
  Course,
  PeriodAttendanceRecord,
  Student,
  TimetableSlot,
} from '../types';

const makeStudent = (id: string): Student => ({
  id,
  schoolId: 'school-1',
  studentIdNumber: id,
  firstNameEn: id,
  lastNameEn: 'Student',
  firstNameTh: id,
  lastNameTh: 'นักเรียน',
  gender: 'other',
  dateOfBirth: '2010-01-01',
  gradeLevel: 'มัธยมศึกษาปีที่ 4',
  room: '401',
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

const makeRecord = (
  id: string,
  studentId: string,
  time: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord => ({
  id,
  studentId,
  date: '2026-11-26',
  time,
  status: 'present',
  checkinMethod: 'teacher_proxy',
  lineNotificationSent: false,
  ...overrides,
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
  enrolledStudentIds: ['s1'],
  description: '',
  ...overrides,
});

const makeSlot = (overrides: Partial<TimetableSlot> = {}): TimetableSlot => ({
  id: 'slot-1',
  schoolId: 'school-1',
  dayOfWeek: 'thu',
  periodNumber: 1,
  startTime: '08:30',
  endTime: '09:20',
  courseCode: 'SCI-1',
  courseTitleTh: 'วิทยาศาสตร์',
  courseTitleEn: 'Science',
  teacherName: 'ครูสมหญิง',
  room: '401',
  classRoom: 'ม.4/1',
  colorTag: 'blue',
  courseId: 'course-1',
  ...overrides,
});

const makePeriodRecord = (
  id: string,
  studentId: string,
  overrides: Partial<PeriodAttendanceRecord> = {}
): PeriodAttendanceRecord => ({
  id,
  schoolId: 'school-1',
  courseId: 'course-1',
  courseCode: 'SCI-1',
  periodNumber: 1,
  timeSlot: '08:30 - 09:20',
  date: '2026-11-26',
  studentId,
  status: 'present',
  verifiedByTeacherId: 'teacher-1',
  verifiedByTeacherName: 'ครูสมหญิง',
  checkMethod: 'teacher_proxy',
  ...overrides,
});

test('getTimetableDayForDate returns weekday keys and excludes weekend or invalid dates', () => {
  assert.equal(getTimetableDayForDate('2026-11-26'), 'thu');
  assert.equal(getTimetableDayForDate('2026-11-28'), null);
  assert.equal(getTimetableDayForDate('2026-02-30'), null);
});

test('buildGateAttendanceReportRows uses latest student gate records and keeps missing students', () => {
  const students = [makeStudent('s1'), makeStudent('s2')];
  const firstIn = makeRecord('in-1', 's1', '07:30:00', { recordType: 'check_in' });
  const latestIn = makeRecord('in-2', 's1', '07:45:00', { recordType: 'check_in' });
  const checkOut = makeRecord('out-1', 's1', '16:00:00', { recordType: 'check_out' });
  const teacherRecord = makeRecord('teacher', 's2', '07:20:00', {
    userType: 'teacher',
    recordType: 'check_in',
  });
  const otherDate = makeRecord('other-date', 's2', '07:20:00', {
    date: '2026-11-25',
    recordType: 'check_in',
  });

  const rows = buildGateAttendanceReportRows(
    students,
    [firstIn, latestIn, checkOut, teacherRecord, otherDate],
    '2026-11-26'
  );

  assert.equal(rows[0].checkIn?.id, 'in-2');
  assert.equal(rows[0].checkOut?.id, 'out-1');
  assert.equal(rows[1].checkIn, undefined);
  assert.equal(rows[1].checkOut, undefined);
});

test('buildGateAttendanceReportRows treats a legacy check-out time as a completed departure', () => {
  const student = makeStudent('s1');
  const checkIn = makeRecord('legacy', 's1', '07:30:00', {
    checkOutTime: '15:45:00',
  });

  const row = buildGateAttendanceReportRows([student], [checkIn], '2026-11-26')[0];
  assert.equal(row.checkOut?.id, 'legacy');
  assert.equal(row.checkOut?.time, '15:45:00');
});

test('buildDailyPeriodReportSessions includes only the selected day, scoped course roster, and its attendance records', () => {
  const students = [makeStudent('s1'), makeStudent('s2')];
  const session = buildDailyPeriodReportSessions({
    date: '2026-11-26',
    schoolId: 'school-1',
    timetableSlots: [
      makeSlot(),
      makeSlot({ id: 'slot-fri', dayOfWeek: 'fri', periodNumber: 2 }),
      makeSlot({ id: 'slot-other-course', courseCode: 'OTHER', courseId: 'other-course' }),
    ],
    courses: [makeCourse()],
    students,
    records: [
      makePeriodRecord('valid', 's1'),
      makePeriodRecord('out-of-roster', 's2'),
      makePeriodRecord('other-date', 's1', { date: '2026-11-25' }),
    ],
  });

  assert.equal(session.length, 1);
  assert.deepEqual(session[0].students.map((student) => student.id), ['s1']);
  assert.deepEqual(session[0].records.map((record) => record.id), ['valid']);
});

test('buildDailyPeriodReportSessions does not expect unrecorded periods on a school day off', () => {
  const options = {
    date: '2026-11-26',
    schoolId: 'school-1',
    timetableSlots: [makeSlot()],
    courses: [makeCourse()],
    students: [makeStudent('s1')],
    records: [] as PeriodAttendanceRecord[],
    schoolDayOff: true,
  };

  assert.deepEqual(buildDailyPeriodReportSessions(options), []);
  assert.equal(
    buildDailyPeriodReportSessions({
      ...options,
      records: [makePeriodRecord('recorded-on-holiday', 's1')],
    }).length,
    1
  );
});
