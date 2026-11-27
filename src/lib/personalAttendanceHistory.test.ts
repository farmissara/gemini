import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPersonalDailyAttendanceRows,
  formatDurationLabel,
  formatThaiShortDateLabel,
  resolveRecordPhotoSource,
} from './personalAttendanceHistory';
import type { AttendanceCorrectionRequest, AttendanceRecord, LeaveRequest } from '../types';

test('formatThaiShortDateLabel formats weekday and Buddhist 2-digit year', () => {
  // 2026-11-26 is Thursday (พฤ), 2026 + 543 = 2569 -> 69
  assert.equal(formatThaiShortDateLabel('2026-11-26'), 'พฤ 26/11/69');
});

test('formatDurationLabel calculates worked/attended hours and minutes cleanly', () => {
  assert.equal(formatDurationLabel('10:40', '20:27'), '9:47');
  assert.equal(formatDurationLabel('07:50:12', '15:50:00'), '7:59');
  assert.equal(formatDurationLabel('10:00', undefined), undefined);
});

test('buildPersonalDailyAttendanceRows merges gate check-in, check-out, leave, absent, and correction for both teacher and student', () => {
  const attendance: AttendanceRecord[] = [
    {
      id: 'att-1',
      studentId: 't-1',
      teacherId: 't-1',
      userType: 'teacher',
      recordType: 'check_in',
      date: '2026-11-26',
      time: '07:45:00',
      status: 'present',
      checkinMethod: 'selfie_geofence',
      photoUrl: 'sch-1/u-1/att-1.jpg',
    },
    {
      id: 'att-2',
      studentId: 't-1',
      teacherId: 't-1',
      userType: 'teacher',
      recordType: 'check_out',
      date: '2026-11-26',
      time: '16:30:00',
      status: 'present',
      checkinMethod: 'selfie_geofence',
    },
    {
      id: 'att-3',
      studentId: 'u-teacher-1',
      recordType: 'check_in',
      date: '2026-11-25',
      time: '08:19:00',
      status: 'late',
      checkinMethod: 'selfie_geofence',
    },
  ];
  const leaves: LeaveRequest[] = [
    {
      id: 'lv-1',
      userId: 't-1',
      userName: 'ครูสมศรี',
      userRole: 'teacher',
      leaveType: 'sick',
      startDate: '2026-11-24',
      endDate: '2026-11-24',
      reason: 'ไข้หวัด',
      status: 'approved',
      createdAt: '2026-11-24T06:00:00Z',
    },
  ];
  const corrections: AttendanceCorrectionRequest[] = [
    {
      id: 'corr-1',
      schoolId: 'sch-1',
      requesterId: 't-1',
      requesterName: 'ครูสมศรี',
      requesterRole: 'teacher',
      targetScope: 'gate_checkin',
      issueType: 'late_arrival',
      date: '2026-11-25',
      originalTime: '08:19',
      requestedTime: '08:00',
      requestedStatus: 'present',
      reason: 'ติดภารกิจหน้าเสาธง',
      stage: 'pending_admin',
      createdAt: '2026-11-25T08:30:00Z',
    },
  ];

  const rows = buildPersonalDailyAttendanceRows({
    targetIds: ['t-1', 'u-teacher-1'],
    attendance,
    leaveRequests: leaves,
    correctionRequests: corrections,
    schoolId: 'sch-1',
    todayDateStr: '2026-11-26',
    daysLookback: 7,
  });

  const nov26 = rows.find((r) => r.date === '2026-11-26');
  const nov25 = rows.find((r) => r.date === '2026-11-25');
  const nov24 = rows.find((r) => r.date === '2026-11-24');
  const nov23 = rows.find((r) => r.date === '2026-11-23');

  assert.ok(nov26 && nov25 && nov24 && nov23);
  assert.equal(nov26.statusKey, 'present');
  assert.equal(nov26.checkInTime, '07:45');
  assert.equal(nov26.checkOutTime, '16:30');
  assert.equal(nov26.durationLabel, '8:45');

  assert.equal(nov25.statusKey, 'late');
  assert.equal(nov25.correctionRequest?.id, 'corr-1');

  assert.equal(nov24.statusKey, 'leave');
  assert.equal(nov24.statusLabelTh, 'ลาป่วย');

  assert.equal(nov23.statusKey, 'absent');
});

test('resolveRecordPhotoSource returns storage path or data url when present', () => {
  assert.equal(
    resolveRecordPhotoSource({
      id: '1',
      studentId: 's1',
      date: '2026-11-26',
      time: '07:50',
      status: 'present',
      checkinMethod: 'selfie_geofence',
      photoStoragePath: 'sch-1/u1/1.jpg',
    }),
    'sch-1/u1/1.jpg'
  );
  assert.equal(
    resolveRecordPhotoSource({
      id: '2',
      studentId: 's1',
      date: '2026-11-26',
      time: '07:50',
      status: 'present',
      checkinMethod: 'selfie_geofence',
      userAvatar: 'data:image/jpeg;base64,abc',
    }),
    'data:image/jpeg;base64,abc'
  );
});
