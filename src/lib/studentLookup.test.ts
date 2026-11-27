import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStudentLookupQuery,
  findMatchingStudents,
  normalizeThaiDigits,
  resolveSingleMatchedStudent,
} from './studentLookup';
import type { Student } from '../types';

const makeStudent = (overrides: Partial<Student>): Student => ({
  id: overrides.id || 'stu-1',
  schoolId: 'school-1',
  studentIdNumber: overrides.studentIdNumber || '2799',
  firstNameEn: overrides.firstNameEn || 'Somchai',
  lastNameEn: overrides.lastNameEn || 'Jaidee',
  firstNameTh: overrides.firstNameTh || 'สมชาย',
  lastNameTh: overrides.lastNameTh || 'ใจดี',
  gender: 'male',
  dateOfBirth: '2012-05-01',
  gradeLevel: overrides.gradeLevel || 'ม.1',
  room: overrides.room || '1/1',
  status: 'active',
  avatarUrl: '',
  gpa: 3.5,
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  guardianEmail: '',
  enrolledDate: '2026-05-15',
  nfcCardUid: overrides.nfcCardUid,
});

test('normalizeThaiDigits and extractStudentLookupQuery handle Thai numbers and QR payloads', () => {
  assert.equal(normalizeThaiDigits('๒๗๙๙'), '2799');
  assert.equal(extractStudentLookupQuery('  EDUVERSE:STU:ED-2799:sch-1  '), 'ED-2799');
  assert.equal(extractStudentLookupQuery('https://example.test/?studentId=๒๗๙๙'), '2799');
});

test('resolveSingleMatchedStudent finds student by numeric core, leading zeros, Thai digits, prefix, or full name', () => {
  const s1 = makeStudent({
    id: 'stu-2799',
    studentIdNumber: '02799',
    firstNameTh: 'กิตติ',
    lastNameTh: 'มั่นคง',
    firstNameEn: 'Kitti',
    lastNameEn: 'Mankong',
  });
  const s2 = makeStudent({
    id: 'stu-3105',
    studentIdNumber: 'ED-3105',
    firstNameTh: 'ปิยะ',
    lastNameTh: 'สุขใจ',
    firstNameEn: 'Piya',
    lastNameEn: 'Sukjai',
    nfcCardUid: '04AABBCC',
  });
  const roster = [s1, s2];

  assert.equal(resolveSingleMatchedStudent('2799', roster)?.id, 'stu-2799');
  assert.equal(resolveSingleMatchedStudent('๒๗๙๙', roster)?.id, 'stu-2799');
  assert.equal(resolveSingleMatchedStudent('02799', roster)?.id, 'stu-2799');
  assert.equal(resolveSingleMatchedStudent('3105', roster)?.id, 'stu-3105');
  assert.equal(resolveSingleMatchedStudent('ed3105', roster)?.id, 'stu-3105');
  assert.equal(resolveSingleMatchedStudent('04AABBCC', roster)?.id, 'stu-3105');
  assert.equal(resolveSingleMatchedStudent('กิตติ มั่นคง', roster)?.id, 'stu-2799');
});

test('resolveSingleMatchedStudent avoids false auto-match when two students share the same numeric tail', () => {
  const s1 = makeStudent({ id: 'stu-a', studentIdNumber: 'ED-2799', firstNameTh: 'เอ', lastNameTh: 'หนึ่ง' });
  const s2 = makeStudent({ id: 'stu-b', studentIdNumber: 'STD-2799', firstNameTh: 'บี', lastNameTh: 'สอง' });

  assert.equal(resolveSingleMatchedStudent('2799', [s1, s2]), undefined);
  assert.equal(findMatchingStudents('2799', [s1, s2]).length, 2);
});

test('findMatchingStudents supports partial ID, Thai name, room filter, and homeroom priority', () => {
  const homeroomStudent = makeStudent({
    id: 'stu-hr',
    studentIdNumber: '27990',
    firstNameTh: 'ณัฐพล',
    lastNameTh: 'รักเรียน',
    gradeLevel: 'ม.2',
    room: '2/1',
  });
  const otherStudent = makeStudent({
    id: 'stu-other',
    studentIdNumber: '2799',
    firstNameTh: 'ธนากร',
    lastNameTh: 'ศรีสุข',
    gradeLevel: 'ม.1',
    room: '1/2',
  });

  const exactNum = findMatchingStudents('2799', [homeroomStudent, otherStudent]);
  assert.equal(exactNum[0]?.id, 'stu-other');
  assert.equal(exactNum.length, 2);

  const byName = findMatchingStudents('ณัฐพล', [otherStudent, homeroomStudent]);
  assert.deepEqual(byName.map((s) => s.id), ['stu-hr']);

  const prioritizedEmpty = findMatchingStudents('', [otherStudent, homeroomStudent], {
    prioritizedStudentIds: new Set(['stu-hr']),
  });
  assert.deepEqual(prioritizedEmpty.map((s) => s.id), ['stu-hr', 'stu-other']);

  const roomFiltered = findMatchingStudents('', [otherStudent, homeroomStudent], {
    roomFilter: 'ม.1 1/2',
  });
  assert.deepEqual(roomFiltered.map((s) => s.id), ['stu-other']);
});
