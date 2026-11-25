import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeTimetableRooms,
  extractShortThaiGradePrefix,
  findHomeroomTeachersForRoom,
  isSameTimetableRoom,
  normalizeTimetableRoomKey,
} from './timetableRoomMatch';
import { filterTimetableSlotsForPersonalRole } from './studentDataScope';
import type { AuthUser, Student, TimetableSlot } from '../types';

test('normalizeTimetableRoomKey handles spacing, missing dot, and full Thai grade prefixes while keeping room numbers distinct', () => {
  assert.equal(normalizeTimetableRoomKey('ป1/1'), 'ป.1/1');
  assert.equal(normalizeTimetableRoomKey('ป. 1 / 1'), 'ป.1/1');
  assert.equal(normalizeTimetableRoomKey('ห้อง ป.1/1'), 'ป.1/1');
  assert.equal(normalizeTimetableRoomKey('ประถมศึกษาปีที่ 1/1'), 'ป.1/1');
  assert.equal(normalizeTimetableRoomKey('ป1'), 'ป.1');

  assert.equal(isSameTimetableRoom('ป.1/1', 'ป1/1'), true);
  assert.equal(isSameTimetableRoom('ป.1/1', 'ป. 1 / 1'), true);
  assert.equal(isSameTimetableRoom('ป.1/1', 'ป.1/10'), false);
  assert.equal(isSameTimetableRoom('ป.1/1', 'ป.1/2'), false);
  assert.equal(isSameTimetableRoom('ป.1', 'ป.1/1'), false);
});

test('extractShortThaiGradePrefix extracts Thai grade prefix from Thai or English grade labels', () => {
  assert.equal(extractShortThaiGradePrefix('ประถมศึกษาปีที่ 1 (P.1)'), 'ป.1');
  assert.equal(extractShortThaiGradePrefix('ป1'), 'ป.1');
  assert.equal(extractShortThaiGradePrefix('มัธยมศึกษาปีที่ 4'), 'ม.4');
  assert.equal(extractShortThaiGradePrefix('อนุบาล 2'), 'อ.2');
});

test('dedupeTimetableRooms prefers earlier priority groups and collapses spacing/dot duplicates', () => {
  const merged = dedupeTimetableRooms([
    ['ป1/1', ' ป.2/1 '],
    ['ป.1/1', 'ป.1/2'],
    ['ป.1/1', 'ป.2/1', 'ม.1/1'],
  ]);
  assert.deepEqual(merged, ['ป1/1', 'ป.2/1', 'ป.1/2', 'ม.1/1']);
});

test('filterTimetableSlotsForPersonalRole matches ป.1 variants without leaking ป.1/10 or ป.1/2', () => {
  const user: AuthUser = {
    id: 'stu-user-1',
    schoolId: 'school-1',
    fullNameTh: 'เด็กชาย ป1',
    fullNameEn: 'Student P1',
    email: 'p1@school.test',
    role: 'student',
    studentRecordId: 'stu-1',
    studentIdNumber: '1001',
    room: '1',
    gradeLevel: 'ประถมศึกษาปีที่ 1 (P.1)',
    avatarUrl: '',
    lineConnected: false,
  };
  const students: Student[] = [
    {
      id: 'stu-1',
      schoolId: 'school-1',
      studentIdNumber: '1001',
      firstNameEn: 'P1',
      lastNameEn: 'Test',
      firstNameTh: 'ป1',
      lastNameTh: 'ทดสอบ',
      gender: 'male',
      dateOfBirth: '2019-01-01',
      gradeLevel: 'ประถมศึกษาปีที่ 1 (P.1)',
      room: '1',
      status: 'active',
      avatarUrl: '',
      gpa: 4,
      guardianName: '',
      guardianRelation: '',
      guardianPhone: '',
      guardianEmail: '',
      lineLinked: false,
      lineNotifyEnabled: false,
      enrolledDate: '2026-05-01',
    },
  ];
  const makeSlot = (id: string, classRoom: string): TimetableSlot => ({
    id,
    schoolId: 'school-1',
    academicYear: '2569',
    semester: '1',
    dayOfWeek: 'mon',
    periodNumber: 1,
    startTime: '08:30',
    endTime: '09:20',
    courseCode: 'ท11101',
    courseTitleTh: 'ภาษาไทย',
    courseTitleEn: 'Thai',
    teacherName: 'ครู ก',
    room: '101',
    classRoom,
    colorTag: 'sky',
  });

  const visible = filterTimetableSlotsForPersonalRole(
    [
      makeSlot('s-dot', 'ป.1/1'),
      makeSlot('s-nodot', 'ป1/1'),
      makeSlot('s-space', 'ป. 1 / 1'),
      makeSlot('s-room10', 'ป.1/10'),
      makeSlot('s-room2', 'ป.1/2'),
      makeSlot('s-grade-only', 'ป.1'),
    ],
    user,
    students,
    []
  );

  assert.deepEqual(
    visible.map((s) => s.id),
    ['s-dot', 's-nodot', 's-space']
  );
});

test('findHomeroomTeachersForRoom matches normalized room names without leaking across room numbers', () => {
  const teachers = [
    { id: 't1', fullNameTh: 'ครูสมใจ', homeroomClasses: ['ป1/1'] },
    { id: 't2', fullNameTh: 'ครูสมศรี', homeroomClasses: ['ป.1/10'] },
    { id: 't3', fullNameTh: 'ครูมานะ', homeroomClasses: ['ป.1/2', 'ป.1 / 1'] },
  ];

  assert.deepEqual(
    findHomeroomTeachersForRoom(teachers, 'ป.1/1').map((t) => t.id),
    ['t1', 't3']
  );
  assert.deepEqual(
    findHomeroomTeachersForRoom(teachers, 'ป.1/10').map((t) => t.id),
    ['t2']
  );
  assert.deepEqual(findHomeroomTeachersForRoom(teachers, ''), []);
});
