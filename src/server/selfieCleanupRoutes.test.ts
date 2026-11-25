import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBangkokClockParts,
  isSchoolScopedStoragePath,
  isStorageObjectPath,
  normalizeSelfieRetentionMinutes,
  parseAttendanceTimeMinutes,
  selectDueAttendanceSelfies,
  type AttendanceSelfieCandidate,
} from '../lib/selfieCleanupLogic.ts';

test('parseAttendanceTimeMinutes parses HH:MM, HH:MM:SS, Thai suffix, and rejects invalid inputs', () => {
  assert.equal(parseAttendanceTimeMinutes('08:05'), 8 * 60 + 5);
  assert.equal(parseAttendanceTimeMinutes('16:30:45'), 16 * 60 + 30);
  assert.equal(parseAttendanceTimeMinutes('15:45 น.'), 15 * 60 + 45);
  assert.equal(parseAttendanceTimeMinutes('00:00'), 0);
  assert.equal(parseAttendanceTimeMinutes('25:10'), null);
  assert.equal(parseAttendanceTimeMinutes('12:75'), null);
  assert.equal(parseAttendanceTimeMinutes(''), null);
  assert.equal(parseAttendanceTimeMinutes(null), null);
});

test('getBangkokClockParts converts UTC timestamp accurately to Asia/Bangkok', () => {
  // 2026-11-25 10:15:00 UTC === 2026-11-25 17:15:00 ICT (UTC+7)
  const parts = getBangkokClockParts(new Date('2026-11-25T10:15:00.000Z'));
  assert.equal(parts.dateStr, '2026-11-25');
  assert.equal(parts.minutes, 17 * 60 + 15);

  // Midnight rollover in Bangkok: 2026-11-25 17:30:00 UTC === 2026-11-26 00:30:00 ICT
  const rollover = getBangkokClockParts(new Date('2026-11-25T17:30:00.000Z'));
  assert.equal(rollover.dateStr, '2026-11-26');
  assert.equal(rollover.minutes, 30);
});

test('storage path validators allow school-scoped relative paths and reject URLs or traversal', () => {
  assert.equal(isStorageObjectPath('school_1/user_1/att_1.jpg'), true);
  assert.equal(isSchoolScopedStoragePath('school_1/user_1/att_1.jpg', 'school_1'), true);
  assert.equal(isSchoolScopedStoragePath('school_2/user_1/att_1.jpg', 'school_1'), false);
  assert.equal(isStorageObjectPath('https://example.com/photo.jpg'), false);
  assert.equal(isStorageObjectPath('data:image/jpeg;base64,/9j/4AAQ'), false);
  assert.equal(isStorageObjectPath('school_1/../other/att.jpg'), false);
  assert.equal(isStorageObjectPath('/leading-slash/att.jpg'), false);
});

test('normalizeSelfieRetentionMinutes falls back to 60 and clamps valid bounds', () => {
  assert.equal(normalizeSelfieRetentionMinutes(undefined), 60);
  assert.equal(normalizeSelfieRetentionMinutes('abc'), 60);
  assert.equal(normalizeSelfieRetentionMinutes(0), 1);
  assert.equal(normalizeSelfieRetentionMinutes(60), 60);
  assert.equal(normalizeSelfieRetentionMinutes('120'), 120);
  assert.equal(normalizeSelfieRetentionMinutes(5000), 1440);
});

test('selectDueAttendanceSelfies keeps today photos before checkout+60m and deletes once >= 60m after checkout', () => {
  const rows: AttendanceSelfieCandidate[] = [
    // Student A: checked in at 07:50 (selfie), checked out at 15:30 (selfie)
    {
      id: 'att_a_in',
      schoolId: 'sch_1',
      studentId: 'stu_a',
      date: '2026-11-25',
      time: '07:50',
      recordType: 'check_in',
      photoUrl: 'sch_1/uid_a/att_a_in.jpg',
    },
    {
      id: 'att_a_out',
      schoolId: 'sch_1',
      studentId: 'stu_a',
      date: '2026-11-25',
      time: '15:30',
      recordType: 'check_out',
      photoUrl: 'sch_1/uid_a/att_a_out.jpg',
    },
    // Student B: checked in at 08:00 (selfie), checked out at 16:00 WITHOUT selfie photo
    {
      id: 'att_b_in',
      schoolId: 'sch_1',
      studentId: 'stu_b',
      date: '2026-11-25',
      time: '08:00',
      recordType: 'check_in',
      photoUrl: 'sch_1/uid_b/att_b_in.jpg',
    },
    {
      id: 'att_b_out',
      schoolId: 'sch_1',
      studentId: 'stu_b',
      date: '2026-11-25',
      time: '16:00',
      recordType: 'check_out',
      photoUrl: null,
    },
    // Student C: checked in today, has NOT checked out yet
    {
      id: 'att_c_in',
      schoolId: 'sch_1',
      studentId: 'stu_c',
      date: '2026-11-25',
      time: '08:05',
      recordType: 'check_in',
      photoUrl: 'sch_1/uid_c/att_c_in.jpg',
    },
  ];

  // At 16:29 (59 minutes after Student A's 15:30 checkout): nothing due yet
  const beforeOneHour = selectDueAttendanceSelfies(rows, {
    todayBangkok: '2026-11-25',
    nowMinutes: 16 * 60 + 29,
    retentionMinutes: 60,
    schoolId: 'sch_1',
  });
  assert.deepEqual(beforeOneHour.recordIdsToClear, []);
  assert.deepEqual(beforeOneHour.storagePathsToDelete, []);

  // At 16:30 (exactly 60 minutes after Student A's 15:30 checkout): Student A's check_in + check_out photos are due;
  // Student B (16:00 checkout -> only 30m ago) and Student C (no checkout) stay intact.
  const atOneHourForA = selectDueAttendanceSelfies(rows, {
    todayBangkok: '2026-11-25',
    nowMinutes: 16 * 60 + 30,
    retentionMinutes: 60,
    schoolId: 'sch_1',
  });
  assert.deepEqual(atOneHourForA.recordIdsToClear, ['att_a_in', 'att_a_out']);
  assert.deepEqual(atOneHourForA.storagePathsToDelete, [
    'sch_1/uid_a/att_a_in.jpg',
    'sch_1/uid_a/att_a_out.jpg',
  ]);
  assert.equal(atOneHourForA.matchedByCheckoutCount, 2);

  // At 17:00 (60 minutes after Student B's photo-less checkout): Student B's check_in selfie is also due
  const atOneHourForB = selectDueAttendanceSelfies(rows, {
    todayBangkok: '2026-11-25',
    nowMinutes: 17 * 60,
    retentionMinutes: 60,
    schoolId: 'sch_1',
  });
  assert.deepEqual(atOneHourForB.recordIdsToClear, ['att_a_in', 'att_a_out', 'att_b_in']);
  assert.deepEqual(atOneHourForB.storagePathsToDelete, [
    'sch_1/uid_a/att_a_in.jpg',
    'sch_1/uid_a/att_a_out.jpg',
    'sch_1/uid_b/att_b_in.jpg',
  ]);
});

test('selectDueAttendanceSelfies cleans up previous-day forgotten checkouts and handles inline data URLs safely', () => {
  const rows: AttendanceSelfieCandidate[] = [
    {
      id: 'att_yesterday_forgot_checkout',
      schoolId: 'sch_1',
      studentId: 'stu_x',
      date: '2026-11-24',
      time: '08:10',
      recordType: 'check_in',
      photoUrl: 'sch_1/uid_x/att_yesterday.jpg',
    },
    {
      id: 'att_yesterday_inline_base64',
      schoolId: 'sch_1',
      studentId: 'stu_y',
      date: '2026-11-24',
      time: '08:12',
      recordType: 'check_in',
      photoUrl: 'data:image/jpeg;base64,abc123',
    },
    {
      id: 'att_other_school',
      schoolId: 'sch_2',
      studentId: 'stu_z',
      date: '2026-11-24',
      time: '08:15',
      recordType: 'check_in',
      photoUrl: 'sch_2/uid_z/att_other.jpg',
    },
  ];

  const result = selectDueAttendanceSelfies(rows, {
    todayBangkok: '2026-11-25',
    nowMinutes: 8 * 60,
    retentionMinutes: 60,
    schoolId: 'sch_1',
  });

  // Clears DB photo_url for both school_1 rows, deletes only storage path for the first, ignores sch_2
  assert.deepEqual(result.recordIdsToClear, [
    'att_yesterday_forgot_checkout',
    'att_yesterday_inline_base64',
  ]);
  assert.deepEqual(result.storagePathsToDelete, ['sch_1/uid_x/att_yesterday.jpg']);
  assert.equal(result.matchedPreviousDaysCount, 2);
});
