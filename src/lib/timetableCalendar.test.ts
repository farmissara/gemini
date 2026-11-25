import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTimetableIcs } from './timetableCalendar';
import { TimetableSlot } from '../types';

const SAMPLE_SLOTS: TimetableSlot[] = [
  {
    id: 'slot-1',
    schoolId: 'sch-1',
    academicYear: '2569',
    semester: '2',
    courseId: 'c-math',
    courseCode: 'ค31101',
    courseTitleTh: 'คณิตศาสตร์พื้นฐาน',
    courseTitleEn: 'Mathematics',
    classRoom: 'ม.4/1',
    teacherName: 'ครูสมศรี',
    dayOfWeek: 'mon',
    periodNumber: 1,
    startTime: '08:30',
    endTime: '09:20',
    room: '201',
    colorTag: '#2563eb',
  },
];

describe('buildTimetableIcs notifications and holiday exclusions', () => {
  it('emits VALARM reminders on timetable slots by default (15m) and supports custom minutes', () => {
    const icsDefault = buildTimetableIcs(
      SAMPLE_SLOTS,
      '2026-11-02',
      '2026-11-30',
      'ตารางเรียน',
      'sch-1',
      { includeHolidays: false }
    );
    assert.ok(icsDefault.includes('BEGIN:VALARM'));
    assert.ok(icsDefault.includes('TRIGGER:-PT15M'));
    assert.ok(icsDefault.includes('ACTION:DISPLAY'));

    const icsNoAlarm = buildTimetableIcs(
      SAMPLE_SLOTS,
      '2026-11-02',
      '2026-11-30',
      'ตารางเรียน',
      'sch-1',
      { includeHolidays: false, reminderMinutes: 0 }
    );
    assert.ok(!icsNoAlarm.includes('BEGIN:VALARM'));
  });

  it('excludes recurring class sessions on Thai holidays falling on the same weekday', () => {
    // 2026-12-07 is a Monday (ชดเชยวันพ่อแห่งชาติ)
    const ics = buildTimetableIcs(
      SAMPLE_SLOTS,
      '2026-12-01',
      '2026-12-15',
      'ตารางเรียน',
      'sch-1',
      { includeHolidays: true, excludeHolidays: true, reminderMinutes: 10 }
    );
    // 08:30 Asia/Bangkok (UTC+7) -> 01:30Z on 2026-12-07
    assert.ok(ics.includes('EXDATE:20261207T013000Z'));
    assert.ok(ics.includes('TRIGGER:-PT10M'));
  });
});
