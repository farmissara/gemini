import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleCalendarEventPayloads } from './googleCalendar';
import { ThaiHoliday } from './thaiHolidays';
import { Assignment, Course, TimetableSlot } from '../types';

const SAMPLE_SLOTS: TimetableSlot[] = [
  {
    id: 'slot-sci-1',
    schoolId: 'school-1',
    academicYear: '2569',
    semester: '2',
    classRoom: 'ม.1/1',
    dayOfWeek: 'mon',
    periodNumber: 1,
    startTime: '08:30',
    endTime: '09:20',
    courseId: 'course-sci',
    courseCode: 'ว21101',
    courseTitleTh: 'วิทยาศาสตร์พื้นฐาน',
    courseTitleEn: 'Science 1',
    teacherName: 'ครูสมชาย',
    room: 'ห้องวิทย์ 2',
    colorTag: '#2563eb',
  },
];

const SAMPLE_HOLIDAYS: ThaiHoliday[] = [
  {
    id: 'hol-const-2026',
    date: '2026-12-07',
    nameTh: 'วันชดเชยวันพ่อแห่งชาติ',
    nameEn: 'Substitution for Father Day',
    type: 'public',
    isSchoolDayOff: true,
  },
];

const SAMPLE_COURSES: Course[] = [
  {
    id: 'course-sci',
    schoolId: 'school-1',
    code: 'ว21101',
    titleTh: 'วิทยาศาสตร์พื้นฐาน',
    titleEn: 'Science 1',
    category: 'core',
    credits: 1.5,
    teacherName: 'ครูสมชาย',
    teacherEmail: 'somchai@school.th',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    schedule: 'Mon 08:30 - 09:20',
    room: 'ห้องวิทย์ 2',
    semester: '2',
    academicYear: '2569',
    enrolledStudentIds: [],
    description: '',
  },
];

const SAMPLE_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg-1',
    schoolId: 'school-1',
    courseId: 'course-sci',
    courseCode: 'ว21101',
    titleTh: 'รายงานโครงงานพืช',
    titleEn: 'Plant Project',
    dueDate: '2026-12-10',
    maxScore: 20,
    points: 20,
    submittedStudentIds: [],
    status: 'active',
  },
];

test('buildGoogleCalendarEventPayloads generates Asia/Bangkok RRULE, EXDATE, popup reminders, and deterministic sync keys', () => {
  const payloads = buildGoogleCalendarEventPayloads({
    slots: SAMPLE_SLOTS,
    assignments: SAMPLE_ASSIGNMENTS,
    courses: SAMPLE_COURSES,
    holidays: SAMPLE_HOLIDAYS,
    schoolId: 'school-1',
    academicYear: '2569',
    semester: '2',
    startDateValue: '2026-12-01',
    endDateValue: '2026-12-31',
    reminderMinutes: 15,
    excludeHolidays: true,
  });

  assert.equal(payloads.length, 3);

  const slotEvent = payloads.find((p) => p.kind === 'timetable');
  assert.ok(slotEvent);
  assert.equal(slotEvent.syncKey, 'slot:school-1:2569-2:slot-sci-1');
  assert.deepEqual(slotEvent.start, {
    dateTime: '2026-12-07T08:30:00+07:00',
    timeZone: 'Asia/Bangkok',
  });
  assert.deepEqual(slotEvent.reminders, {
    useDefault: false,
    overrides: [{ method: 'popup', minutes: 15 }],
  });
  assert.ok(slotEvent.recurrence?.[0].startsWith('RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL='));
  assert.equal(slotEvent.recurrence?.[1], 'EXDATE;TZID=Asia/Bangkok:20261207T083000');
  assert.equal(slotEvent.extendedProperties.private.baanpakkruSource, 'baanpakkru');

  const assignmentEvent = payloads.find((p) => p.kind === 'assignment');
  assert.ok(assignmentEvent);
  assert.deepEqual(assignmentEvent.reminders, {
    useDefault: false,
    overrides: [{ method: 'popup', minutes: 1440 }],
  });

  const holidayEvent = payloads.find((p) => p.kind === 'holiday');
  assert.ok(holidayEvent);
  assert.deepEqual(holidayEvent.start, { date: '2026-12-07' });
  assert.deepEqual(holidayEvent.end, { date: '2026-12-08' });
});
