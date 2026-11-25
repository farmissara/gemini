import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCorrectionRequest,
  evaluatePeriodTimingStatus,
  loadAttendanceCorrections,
  reviewCorrectionRequest,
} from './attendanceCorrections.ts';

function ensureMockStorage() {
  const store = new Map<string, string>();
  if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };
  } else {
    globalThis.localStorage.clear();
  }
}

test('evaluatePeriodTimingStatus handles grace window and flexible checkout cleanly', () => {
  // 08:30 - 09:20 with 15-min grace
  const onTimeGrace = evaluatePeriodTimingStatus({
    timeSlot: '08:30 - 09:20',
    checkType: 'check_in',
    actualMinutes: 8 * 60 + 42,
    graceMinutes: 15,
  });
  assert.equal(onTimeGrace.status, 'present');

  const lateArrival = evaluatePeriodTimingStatus({
    timeSlot: '08:30 - 09:20',
    checkType: 'check_in',
    actualMinutes: 8 * 60 + 52,
    graceMinutes: 15,
  });
  assert.equal(lateArrival.status, 'late');

  const openFlex = evaluatePeriodTimingStatus({
    timeSlot: '08:30 - 09:20',
    checkType: 'check_in',
    actualMinutes: 9 * 60 + 5,
    graceMinutes: 999,
  });
  assert.equal(openFlex.status, 'present');

  const extendedOut = evaluatePeriodTimingStatus({
    timeSlot: '08:30 - 09:20',
    checkType: 'check_out',
    actualMinutes: 9 * 60 + 35,
    graceMinutes: 15,
    allowFlexibleCheckout: true,
  });
  assert.equal(extendedOut.status, 'present');
  assert.match(extendedOut.timingTagTh, /ออกคาบช้า/);
});

test('hierarchical correction workflow routes Homeroom Teacher (stage 1) -> School Admin (stage 2)', () => {
  ensureMockStorage();
  const created = createCorrectionRequest({
    schoolId: 'sch-test-1',
    requesterId: 'stu-1',
    requesterName: 'ด.ช.สมชาย ใจดี',
    requesterRole: 'student',
    requesterCode: 'STU-001',
    departmentOrRoom: 'ม.4/1',
    targetScope: 'gate_checkin',
    issueType: 'forgot_checkin',
    date: '2026-11-24',
    requestedTime: '07:45',
    requestedStatus: 'present',
    reason: 'ลืมหยิบบัตรสแกนหน้าประตู',
    homeroomTeacherName: 'ครูสมศรี',
  });
  assert.equal(created.stage, 'pending_homeroom');

  // Teacher cannot skip straight to final approved; stage 1 advances to pending_admin
  const step1 = reviewCorrectionRequest({
    schoolId: 'sch-test-1',
    requestId: created.id,
    reviewerRole: 'teacher',
    reviewerName: 'ครูสมศรี',
    decision: 'approve',
  });
  assert.equal(step1.updated?.stage, 'pending_admin');

  // Teacher attempting stage 2 gets permission error
  const blockedTeacherStep2 = reviewCorrectionRequest({
    schoolId: 'sch-test-1',
    requestId: created.id,
    reviewerRole: 'teacher',
    reviewerName: 'ครูสมศรี',
    decision: 'approve',
  });
  assert.ok(blockedTeacherStep2.error);

  // Admin approves stage 2
  const step2 = reviewCorrectionRequest({
    schoolId: 'sch-test-1',
    requestId: created.id,
    reviewerRole: 'admin',
    reviewerName: 'ผอ.ผุสรัตน์',
    decision: 'approve',
  });
  assert.equal(step2.updated?.stage, 'approved');
  assert.equal(loadAttendanceCorrections('sch-test-1')[0]?.stage, 'approved');
});
